from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


# ── Auth Schemas ──────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    avatar: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── Project Schemas ───────────────────────────────────────────
class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    created_by: UUID
    created_at: datetime
    task_count: int = 0

    class Config:
        from_attributes = True


# ── Task Schemas ──────────────────────────────────────────────
class SubtaskCreate(BaseModel):
    id: Optional[UUID] = None  # If provided, this is an existing subtask to update
    title: str = Field(..., min_length=1, max_length=200)
    completed: Optional[bool] = False
    order: Optional[int] = 0


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    status: str = "NOT_STARTED"
    priority: str = "MEDIUM"
    progress: int = Field(0, ge=0, le=100)
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    assigned_user: Optional[UUID] = None
    position_x: float = Field(0.0)
    position_y: float = Field(0.0)
    subtasks: Optional[List[SubtaskCreate]] = None


class SubtaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    completed: Optional[bool] = None
    order: Optional[int] = None


class SubtaskResponse(BaseModel):
    id: UUID
    title: str
    completed: bool
    order: int

    class Config:
        from_attributes = True


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    progress: Optional[int] = Field(None, ge=0, le=100)
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    assigned_user: Optional[UUID] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    subtasks: Optional[List[SubtaskCreate]] = None


class TaskPositionUpdate(BaseModel):
    position_x: float
    position_y: float


class DependencyResponse(BaseModel):
    id: UUID
    title: str
    status: str

    class Config:
        from_attributes = True


class TaskResponse(BaseModel):
    id: UUID
    project_id: UUID
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    progress: int
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = None
    assigned_user: Optional[UUID] = None
    position_x: float
    position_y: float
    created_at: datetime
    dependencies: List[DependencyResponse] = []
    dependents: List[DependencyResponse] = []
    subtasks: List[SubtaskResponse] = []
    assignee_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Dependency Schemas ────────────────────────────────────────
class DependencyCreate(BaseModel):
    task_id: UUID
    depends_on_id: UUID


# ── Analytics Schemas ─────────────────────────────────────────
class AnalyticsResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    blocked_tasks: int
    in_progress_tasks: int
    not_started_tasks: int
    progress_percentage: float
    critical_path_length: int
    status_distribution: dict
    priority_distribution: dict
    weekly_completed: List[dict]
