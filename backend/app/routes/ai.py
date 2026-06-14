import json
import math
import re
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.config import settings
from app.database import get_db
from app.models import Project, Subtask, Task, TaskPriority, TaskStatus
from app.schemas import AiProjectRequest, AiProjectResponse, TaskResponse, DependencyResponse, SubtaskResponse
from app.services import get_current_user
from app.services.graph import propagate_blocked_status

router = APIRouter()


def _extract_json_payload(raw_text: Any) -> Dict[str, Any]:
    if isinstance(raw_text, dict):
        return raw_text

    text = str(raw_text or "").strip()
    if not text:
        raise ValueError("No content returned from AI service")

    # Try JSON directly, then try to extract the first JSON object from the text.
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidate = text[start:end + 1]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # Support broken JSON from models by normalizing quotes and removing trailing commas.
    cleaned = re.sub(r",\s*}\s*$", "}", text)
    cleaned = cleaned.replace("\n", " ").replace("\r", " ")
    cleaned = re.sub(r'([\'"])?([a-zA-Z0-9_]+)\1\s*:\s*', r'"\2": ', cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Unable to parse AI response as JSON: {exc}") from exc


async def _call_groq_api(prompt: str, history: List[Any] = None) -> Dict[str, Any]:
    import logging

    if not settings.GROQ_API_KEY:
        raise RuntimeError("GROQ API key is not configured")

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert project planning assistant. "
                "Return only a valid JSON object describing a project with tasks, descriptions, priorities, and dependencies. "
                "Use the key names: title, description, tasks. "
                "Each task should include title, description, status, priority, estimated_hours, depends_on, and optional subtasks. "
                "Do not include any text outside the JSON object."
            ),
        }
    ]

    if history:
        for msg in history:
            # Safely get role and content whether it's a dict or a Pydantic model
            role = msg.role if hasattr(msg, "role") else msg.get("role", "user")
            content = msg.content if hasattr(msg, "content") else msg.get("content", "")
            messages.append({"role": role, "content": content})

    messages.append({
        "role": "user",
        "content": (
            "Create a project plan in JSON format for the following request: \n\n" + prompt +
            "\n\nRespond with ONLY a valid JSON object using this format:\n"
            '{"title": "...", "description": "...", "tasks": [{"title": "...", "description": "...", "status": "NOT_STARTED", "priority": "MEDIUM", "estimated_hours": 5, "depends_on": []}]}'
        ),
    })

    payload = {
        "model": settings.GROQ_MODEL,
        "messages": messages,
        "max_tokens": 4096,
        "temperature": 0.3,
    }

    logging.info(f"Calling Groq API: model={settings.GROQ_MODEL}, url={settings.GROQ_API_URL}")

    async with httpx.AsyncClient(timeout=settings.GROQ_TIMEOUT_SECONDS) as client:
        response = await client.post(
            settings.GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

        if response.status_code != 200:
            error_body = response.text
            logging.error(f"Groq API error {response.status_code}: {error_body}")
            raise RuntimeError(f"Groq API returned {response.status_code}: {error_body}")

        body = response.json()

    logging.info(f"Groq raw response body keys: {list(body.keys()) if isinstance(body, dict) else type(body)}")

    # Parse OpenAI-compatible chat completion response
    output = None
    if isinstance(body, dict):
        choices = body.get("choices")
        if isinstance(choices, list) and choices:
            first_choice = choices[0]
            if isinstance(first_choice, dict):
                message = first_choice.get("message")
                if isinstance(message, dict):
                    output = message.get("content", "")
                else:
                    output = first_choice.get("content") or first_choice.get("text") or first_choice
        if output is None:
            output = body.get("output") or body.get("text") or body.get("response") or body

    logging.info(f"Parsed AI output: {str(output)[:500]}")
    return _extract_json_payload(output)


def _default_schema(prompt: str) -> Dict[str, Any]:
    return {
        "title": prompt.strip().split(".\n")[0][:120] if prompt else "AI Generated Project",
        "description": prompt.strip(),
        "tasks": [
            {
                "title": "Define project requirements",
                "description": "Clarify scope, goals, and user stories.",
                "status": "NOT_STARTED",
                "priority": "HIGH",
                "estimated_hours": 4,
                "depends_on": [],
            },
            {
                "title": "Design core user flows",
                "description": "Outline the main screens and interactions.",
                "status": "NOT_STARTED",
                "priority": "MEDIUM",
                "estimated_hours": 6,
                "depends_on": ["Define project requirements"],
            },
            {
                "title": "Implement the first MVP feature",
                "description": "Build the essential functionality for launch.",
                "status": "NOT_STARTED",
                "priority": "MEDIUM",
                "estimated_hours": 10,
                "depends_on": ["Design core user flows"],
            },
        ],
    }


def _normalize_schema(raw_schema: Any, prompt: str) -> Dict[str, Any]:
    schema = raw_schema if isinstance(raw_schema, dict) else {}
    title = schema.get("title") or schema.get("project_title") or prompt.strip().split(".\n")[0][:120] or "AI Generated Project"
    description = schema.get("description") or prompt.strip()
    raw_tasks = schema.get("tasks") or schema.get("items") or []

    normalized_tasks: List[Dict[str, Any]] = []
    for item in raw_tasks:
        if not isinstance(item, dict):
            continue
        normalized_tasks.append({
            "title": item.get("title") or item.get("name") or "Untitled task",
            "description": item.get("description", ""),
            "status": str(item.get("status", "NOT_STARTED")).upper(),
            "priority": str(item.get("priority", "MEDIUM")).upper(),
            "estimated_hours": float(item.get("estimated_hours", 0) or 0),
            "dependencies": item.get("depends_on") or item.get("dependencies") or [],
            "subtasks": item.get("subtasks") if isinstance(item.get("subtasks"), list) else [],
        })

    if not normalized_tasks:
        default = _default_schema(prompt)
        normalized_tasks = default["tasks"]
        title = default["title"]
        description = default["description"]

    return {"title": title, "description": description, "tasks": normalized_tasks}


def _build_task_response(task: Task) -> TaskResponse:
    deps = [DependencyResponse(id=d.id, title=d.title, status=d.status.value if hasattr(d.status, "value") else d.status) for d in (task.dependencies or [])]
    dependents = [DependencyResponse(id=d.id, title=d.title, status=d.status.value if hasattr(d.status, "value") else d.status) for d in (task.dependents or [])]
    subtasks = [SubtaskResponse(id=s.id, title=s.title, completed=s.completed, order=s.order or 0) for s in (task.subtasks or [])]
    return TaskResponse(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        status=task.status.value if hasattr(task.status, "value") else task.status,
        priority=task.priority.value if hasattr(task.priority, "value") else task.priority,
        progress=task.progress,
        due_date=task.due_date,
        estimated_hours=task.estimated_hours,
        assigned_user=task.assigned_user,
        position_x=task.position_x,
        position_y=task.position_y,
        created_at=task.created_at,
        dependencies=deps,
        dependents=dependents,
        subtasks=subtasks,
        assignee_name=task.assignee.name if task.assignee else None,
    )


def _create_task_positions(index: int, total: int) -> Dict[str, float]:
    angle = (index / max(total, 1)) * 2 * math.pi
    return {
        "x": 400 + math.cos(angle) * 220,
        "y": 250 + math.sin(angle) * 150,
    }


async def _build_project_from_schema(schema: Dict[str, Any], current_user, db: AsyncSession, existing_project: Optional[Project] = None, history: List[Any] = None) -> Project:
    from app.models import Task
    from sqlalchemy import delete

    history_json = [h.model_dump() if hasattr(h, 'model_dump') else h for h in (history or [])]
    
    if existing_project:
        project = existing_project
        project.title = schema["title"]
        project.description = schema["description"]
        project.ai_chat_history = history_json
        
        # Delete existing tasks to replace them with the updated schema
        await db.execute(delete(Task).where(Task.project_id == project.id))
        await db.flush()
    else:
        project = Project(
            title=schema["title"], 
            description=schema["description"], 
            created_by=current_user.id,
            ai_chat_history=history_json
        )
        db.add(project)
        await db.flush()

    created_tasks: List[Task] = []
    title_to_task: Dict[str, Task] = {}
    total_tasks = len(schema["tasks"])

    for index, task_payload in enumerate(schema["tasks"]):
        positions = _create_task_positions(index, total_tasks)
        status_value = str(task_payload.get("status", "NOT_STARTED") or "NOT_STARTED").upper()
        priority_value = str(task_payload.get("priority", "MEDIUM") or "MEDIUM").upper()
        try:
            status_value = TaskStatus(status_value)
        except ValueError:
            status_value = TaskStatus.NOT_STARTED

        try:
            priority_value = TaskPriority(priority_value)
        except ValueError:
            priority_value = TaskPriority.MEDIUM

        task = Task(
            project_id=project.id,
            title=task_payload["title"],
            description=task_payload.get("description"),
            status=status_value,
            priority=priority_value,
            progress=0,
            estimated_hours=task_payload.get("estimated_hours"),
            position_x=positions["x"],
            position_y=positions["y"],
        )
        db.add(task)
        await db.flush()

        subtasks_payload = task_payload.get("subtasks") or []
        for sub_index, subtask_data in enumerate(subtasks_payload):
            db.add(Subtask(
                task_id=task.id,
                title=subtask_data.get("title", "Untitled subtask"),
                completed=subtask_data.get("completed", False) or False,
                order=subtask_data.get("order") if subtask_data.get("order") is not None else sub_index,
            ))

        created_tasks.append(task)
        title_to_task[task.title.lower()] = task

    await db.flush()

    from sqlalchemy import insert
    from app.models import task_dependencies
    
    dependencies_to_insert = []
    for index, task_payload in enumerate(schema["tasks"]):
        source_task = created_tasks[index]
        dependency_names = task_payload.get("dependencies") or []
        for raw_dependency in dependency_names:
            if raw_dependency is None:
                continue
            dependency_name = str(raw_dependency).strip()
            matched_task = title_to_task.get(dependency_name.lower())
            if not matched_task and dependency_name.isdigit():
                idx = int(dependency_name)
                if 0 <= idx < len(created_tasks):
                    matched_task = created_tasks[idx]
            if matched_task and matched_task.id != source_task.id:
                dependencies_to_insert.append({
                    "task_id": source_task.id,
                    "depends_on_id": matched_task.id
                })

    if dependencies_to_insert:
        await db.execute(insert(task_dependencies).values(dependencies_to_insert))

    await db.flush()
    await propagate_blocked_status(db, project.id)
    return project


@router.post("/project", response_model=AiProjectResponse, status_code=201)
async def generate_project(
    request: AiProjectRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    existing_project = None
    if request.project_id:
        result = await db.execute(select(Project).where(Project.id == request.project_id))
        existing_project = result.scalar_one_or_none()
        if not existing_project:
            raise HTTPException(status_code=404, detail="Project not found")
        if existing_project.created_by != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")

    try:
        if settings.GROQ_API_KEY:
            raw_schema = await _call_groq_api(request.prompt, request.history)
        else:
            raw_schema = _default_schema(request.prompt)
    except Exception as exc:
        import logging
        logging.error(f"Error calling AI API, falling back to default schema: {exc}")
        raw_schema = _default_schema(request.prompt)

    schema = _normalize_schema(raw_schema, request.prompt)
    project = await _build_project_from_schema(schema, current_user, db, existing_project=existing_project, history=request.history)

    result = await db.execute(
        select(Task)
        .where(Task.project_id == project.id)
        .options(selectinload(Task.dependencies), selectinload(Task.dependents), selectinload(Task.assignee), selectinload(Task.subtasks))
    )
    tasks = result.scalars().unique().all()

    return AiProjectResponse(
        project_id=project.id,
        title=project.title,
        description=project.description,
        task_count=len(tasks),
        tasks=[_build_task_response(task) for task in tasks],
        raw_schema=schema,
        message="AI-generated project updated successfully." if existing_project else "AI-generated project created successfully.",
    )


@router.get("/project/{project_id}/history", response_model=List[Dict[str, str]])
async def get_project_history(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project or project.created_by != current_user.id:
        return []
    return project.ai_chat_history or []
