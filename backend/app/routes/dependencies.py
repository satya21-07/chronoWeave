from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from app.database import get_db
from app.models import User, Task, task_dependencies
from app.schemas import DependencyCreate
from app.services import get_current_user
from app.services.graph import get_adjacency_list, detect_cycle, propagate_blocked_status
from app.websocket_manager import manager

router = APIRouter()


@router.post("/", status_code=201)
async def add_dependency(
    data: DependencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Validate both tasks exist
    task_result = await db.execute(select(Task).where(Task.id == data.task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    dep_result = await db.execute(select(Task).where(Task.id == data.depends_on_id))
    dep_task = dep_result.scalar_one_or_none()
    if not dep_task:
        raise HTTPException(status_code=404, detail="Dependency task not found")

    if task.project_id != dep_task.project_id:
        raise HTTPException(status_code=400, detail="Tasks must be in the same project")

    if data.task_id == data.depends_on_id:
        raise HTTPException(status_code=400, detail="A task cannot depend on itself")

    # Check for existing dependency
    existing = await db.execute(
        select(task_dependencies).where(
            task_dependencies.c.task_id == data.task_id,
            task_dependencies.c.depends_on_id == data.depends_on_id,
        )
    )
    if existing.first():
        raise HTTPException(status_code=400, detail="Dependency already exists")

    # Cycle detection
    adj = await get_adjacency_list(db, task.project_id)
    if detect_cycle(adj, (data.task_id, data.depends_on_id)):
        raise HTTPException(status_code=400, detail="Adding this dependency would create a cycle")

    # Insert dependency
    await db.execute(
        task_dependencies.insert().values(task_id=data.task_id, depends_on_id=data.depends_on_id)
    )
    await db.flush()

    # Propagate blocked status
    await propagate_blocked_status(db, task.project_id)

    await manager.broadcast(str(task.project_id), {
        "type": "dependency_added",
        "task_id": str(data.task_id),
        "depends_on_id": str(data.depends_on_id),
    })
    return {"message": "Dependency added successfully"}


@router.delete("/")
async def remove_dependency(
    data: DependencyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task_result = await db.execute(select(Task).where(Task.id == data.task_id))
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.execute(
        task_dependencies.delete().where(
            task_dependencies.c.task_id == data.task_id,
            task_dependencies.c.depends_on_id == data.depends_on_id,
        )
    )
    await db.flush()

    await propagate_blocked_status(db, task.project_id)

    await manager.broadcast(str(task.project_id), {
        "type": "dependency_removed",
        "task_id": str(data.task_id),
        "depends_on_id": str(data.depends_on_id),
    })
    return {"message": "Dependency removed"}


@router.get("/critical-path/{project_id}")
async def get_critical_path(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.graph import calculate_critical_path

    adj = await get_adjacency_list(db, project_id)

    result = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = result.scalars().all()
    task_hours = {t.id: (t.estimated_hours or 1.0) for t in tasks}

    path = calculate_critical_path(adj, task_hours)
    return {"critical_path": [str(tid) for tid in path], "length": len(path)}
