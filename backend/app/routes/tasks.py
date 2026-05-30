from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from uuid import UUID
from app.database import get_db
import math
from app.models import User, Task, TaskStatus, TaskPriority, Subtask
from app.schemas import TaskCreate, TaskUpdate, TaskPositionUpdate, TaskResponse, DependencyResponse, SubtaskCreate, SubtaskResponse, SubtaskUpdate
from app.services import get_current_user
from app.services.graph import propagate_blocked_status
from app.websocket_manager import manager

router = APIRouter()


def _build_task_response(task: Task) -> TaskResponse:
    deps = [DependencyResponse(id=d.id, title=d.title, status=d.status.value if hasattr(d.status, 'value') else d.status) for d in (task.dependencies or [])]
    dependents = [DependencyResponse(id=d.id, title=d.title, status=d.status.value if hasattr(d.status, 'value') else d.status) for d in (task.dependents or [])]
    subtasks = [SubtaskResponse(id=s.id, title=s.title, completed=s.completed, order=s.order or 0) for s in (task.subtasks or [])]
    return TaskResponse(
        id=task.id, project_id=task.project_id, title=task.title,
        description=task.description,
        status=task.status.value if hasattr(task.status, 'value') else task.status,
        priority=task.priority.value if hasattr(task.priority, 'value') else task.priority,
        progress=task.progress, due_date=task.due_date,
        estimated_hours=task.estimated_hours, assigned_user=task.assigned_user,
        position_x=task.position_x, position_y=task.position_y,
        created_at=task.created_at, dependencies=deps, dependents=dependents,
        subtasks=subtasks,
        assignee_name=task.assignee.name if task.assignee else None,
    )


@router.get("/project/{project_id}", response_model=List[TaskResponse])
async def list_tasks(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task)
        .where(Task.project_id == project_id)
        .options(selectinload(Task.dependencies), selectinload(Task.dependents), selectinload(Task.assignee), selectinload(Task.subtasks))
        .order_by(Task.created_at)
    )
    tasks = result.scalars().unique().all()
    return [_build_task_response(t) for t in tasks]


@router.post("/project/{project_id}", response_model=TaskResponse, status_code=201)
async def create_task(
    project_id: UUID,
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        task = Task(
            project_id=project_id,
            title=data.title,
            description=data.description,
            status=TaskStatus(data.status),
            priority=TaskPriority(data.priority),
            progress=data.progress,
            due_date=data.due_date,
            estimated_hours=data.estimated_hours,
            assigned_user=data.assigned_user,
            position_x=data.position_x,
            position_y=data.position_y,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid enum value: {str(e)}")
    
    db.add(task)
    await db.flush()

    if data.subtasks:
        for i, subtask_data in enumerate(data.subtasks):
            db.add(Subtask(
                task_id=task.id,
                title=subtask_data.title,
                completed=subtask_data.completed or False,
                order=subtask_data.order if subtask_data.order is not None else i,
            ))
        await db.flush()

    # Reload with relationships
    result = await db.execute(
        select(Task).where(Task.id == task.id)
        .options(selectinload(Task.dependencies), selectinload(Task.dependents), selectinload(Task.assignee), selectinload(Task.subtasks))
    )
    task = result.scalar_one()
    resp = _build_task_response(task)

    await manager.broadcast(str(project_id), {
        "type": "task_created",
        "task": resp.model_dump(mode="json"),
    })
    return resp


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id)
        .options(selectinload(Task.dependencies), selectinload(Task.dependents), selectinload(Task.assignee), selectinload(Task.subtasks))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _build_task_response(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id)
        .options(selectinload(Task.dependencies), selectinload(Task.dependents), selectinload(Task.assignee), selectinload(Task.subtasks))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = data.model_dump(exclude_unset=True)
    subtasks_data = update_data.pop("subtasks", None)

    for field, value in update_data.items():
        if field == "status" and value:
            setattr(task, field, TaskStatus(value))
        else:
            setattr(task, field, value)

    if subtasks_data:
        base_order = len(task.subtasks or [])
        for i, subtask_data in enumerate(subtasks_data):
            subtask_id = subtask_data.get('id')
            # Only create new subtasks (those without an ID)
            if not subtask_id:
                order = subtask_data.get('order')
                db.add(Subtask(
                    task_id=task.id,
                    title=subtask_data.get('title', ''),
                    completed=subtask_data.get('completed', False),
                    order=order if order is not None else base_order + i,
                ))

    await db.flush()

    # Propagate blocked status
    await propagate_blocked_status(db, task.project_id)

    # Reload
    result = await db.execute(
        select(Task).where(Task.id == task.id)
        .options(selectinload(Task.dependencies), selectinload(Task.dependents), selectinload(Task.assignee), selectinload(Task.subtasks))
    )
    task = result.scalar_one()
    resp = _build_task_response(task)

    await manager.broadcast(str(task.project_id), {
        "type": "task_updated",
        "task": resp.model_dump(mode="json"),
    })
    return resp


@router.post("/{task_id}/subtasks", response_model=List[SubtaskResponse], status_code=201)
async def create_task_subtasks(
    task_id: UUID,
    subtasks: List[SubtaskCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id).options(selectinload(Task.subtasks)))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    base_order = len(task.subtasks or [])
    created = []
    for i, subtask_data in enumerate(subtasks):
        sub = Subtask(
            task_id=task.id,
            title=subtask_data.title,
            completed=subtask_data.completed or False,
            order=subtask_data.order if subtask_data.order is not None else base_order + i,
        )
        db.add(sub)
        created.append(sub)
    await db.flush()
    return created


@router.put("/{task_id}/subtasks/{subtask_id}", response_model=TaskResponse)
async def update_task_subtask(
    task_id: UUID,
    subtask_id: UUID,
    data: SubtaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task)
        .where(Task.id == task_id)
        .options(selectinload(Task.subtasks), selectinload(Task.dependencies), selectinload(Task.dependents), selectinload(Task.assignee))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    subtask = next((s for s in (task.subtasks or []) if s.id == subtask_id), None)
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subtask, field, value)

    if 'completed' in update_data:
        total = len(task.subtasks or [])
        done = len([s for s in (task.subtasks or []) if s.completed])
        task.progress = 0 if total == 0 else math.floor((done / total) * 100)

    await db.flush()

    resp = _build_task_response(task)
    await manager.broadcast(str(task.project_id), {
        "type": "task_updated",
        "task": resp.model_dump(mode="json"),
    })
    return resp


@router.put("/{task_id}/position", response_model=TaskResponse)
async def update_task_position(
    task_id: UUID,
    data: TaskPositionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(Task.id == task_id)
        .options(selectinload(Task.dependencies), selectinload(Task.dependents), selectinload(Task.assignee))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.position_x = data.position_x
    task.position_y = data.position_y
    await db.flush()

    resp = _build_task_response(task)
    await manager.broadcast(str(task.project_id), {
        "type": "task_moved",
        "task": resp.model_dump(mode="json"),
    })
    return resp


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project_id = task.project_id
    await db.delete(task)
    await db.flush()

    await manager.broadcast(str(project_id), {
        "type": "task_deleted",
        "task_id": str(task_id),
    })
