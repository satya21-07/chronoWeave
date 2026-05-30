from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from uuid import UUID
from app.database import get_db
from app.models import User, Project, Task
from app.schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from app.services import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.created_by == current_user.id).order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()

    response = []
    for p in projects:
        count_result = await db.execute(
            select(func.count(Task.id)).where(Task.project_id == p.id)
        )
        task_count = count_result.scalar() or 0
        response.append(ProjectResponse(
            id=p.id, title=p.title, description=p.description,
            created_by=p.created_by, created_at=p.created_at, task_count=task_count,
        ))
    return response


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = Project(title=data.title, description=data.description, created_by=current_user.id)
    db.add(project)
    await db.flush()
    await db.refresh(project)
    return ProjectResponse(
        id=project.id, title=project.title, description=project.description,
        created_by=project.created_by, created_at=project.created_at, task_count=0,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.created_by == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    count_result = await db.execute(select(func.count(Task.id)).where(Task.project_id == project.id))
    task_count = count_result.scalar() or 0
    return ProjectResponse(
        id=project.id, title=project.title, description=project.description,
        created_by=project.created_by, created_at=project.created_at, task_count=task_count,
    )


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.created_by == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.title is not None:
        project.title = data.title
    if data.description is not None:
        project.description = data.description
    await db.flush()
    await db.refresh(project)

    count_result = await db.execute(select(func.count(Task.id)).where(Task.project_id == project.id))
    task_count = count_result.scalar() or 0
    return ProjectResponse(
        id=project.id, title=project.title, description=project.description,
        created_by=project.created_by, created_at=project.created_at, task_count=task_count,
    )


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.created_by == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
