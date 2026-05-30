from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from uuid import UUID
from datetime import datetime, timedelta
from app.database import get_db
from app.models import User, Task, TaskStatus
from app.schemas import AnalyticsResponse
from app.services import get_current_user
from app.services.graph import get_adjacency_list, calculate_critical_path

router = APIRouter()


@router.get("/{project_id}", response_model=AnalyticsResponse)
async def get_analytics(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.project_id == project_id))
    tasks = result.scalars().all()
    total = len(tasks)

    status_counts = {s.value: 0 for s in TaskStatus}
    priority_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}

    for t in tasks:
        s = t.status.value if hasattr(t.status, 'value') else t.status
        p = t.priority.value if hasattr(t.priority, 'value') else t.priority
        status_counts[s] = status_counts.get(s, 0) + 1
        priority_counts[p] = priority_counts.get(p, 0) + 1

    completed = status_counts.get("COMPLETED", 0)
    blocked = status_counts.get("BLOCKED", 0)
    in_progress = status_counts.get("IN_PROGRESS", 0)
    not_started = status_counts.get("NOT_STARTED", 0)

    progress = (completed / total * 100) if total > 0 else 0

    # Critical path
    adj = await get_adjacency_list(db, project_id)
    task_hours = {t.id: (t.estimated_hours or 1.0) for t in tasks}
    cp = calculate_critical_path(adj, task_hours)

    # Weekly completed data (last 8 weeks)
    weekly = []
    now = datetime.utcnow()
    for i in range(7, -1, -1):
        week_start = now - timedelta(weeks=i + 1)
        week_end = now - timedelta(weeks=i)
        count = sum(
            1 for t in tasks
            if (t.status.value if hasattr(t.status, 'value') else t.status) == "COMPLETED"
            and t.created_at and week_start <= t.created_at <= week_end
        )
        weekly.append({
            "week": week_start.strftime("%b %d"),
            "completed": count,
        })

    return AnalyticsResponse(
        total_tasks=total,
        completed_tasks=completed,
        blocked_tasks=blocked,
        in_progress_tasks=in_progress,
        not_started_tasks=not_started,
        progress_percentage=round(progress, 1),
        critical_path_length=len(cp),
        status_distribution=status_counts,
        priority_distribution=priority_counts,
        weekly_completed=weekly,
    )
