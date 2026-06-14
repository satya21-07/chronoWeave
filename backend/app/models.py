import uuid
import enum
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, Float, DateTime, JSON,
    ForeignKey, Enum as SQLEnum, Table, Index, Boolean
)
from sqlalchemy.orm import relationship
from app.database import Base, GUID


class TaskStatus(str, enum.Enum):
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"


class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    avatar = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="creator")


class Project(Base):
    __tablename__ = "projects"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(GUID(), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    ai_chat_history = Column(JSON, nullable=True)

    creator = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")


# Association table for task dependencies
task_dependencies = Table(
    "task_dependencies",
    Base.metadata,
    Column("task_id", GUID(), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("depends_on_id", GUID(), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    project_id = Column(GUID(), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.NOT_STARTED, index=True)
    priority = Column(SQLEnum(TaskPriority), default=TaskPriority.MEDIUM)
    progress = Column(Integer, default=0)
    due_date = Column(DateTime, nullable=True)
    estimated_hours = Column(Float, nullable=True)
    assigned_user = Column(GUID(), ForeignKey("users.id"), nullable=True)
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="tasks")
    assignee = relationship("User", foreign_keys=[assigned_user])
    dependencies = relationship(
        "Task",
        secondary=task_dependencies,
        primaryjoin=(id == task_dependencies.c.task_id),
        secondaryjoin=(id == task_dependencies.c.depends_on_id),
        backref="dependents",
        lazy="selectin",
    )

    subtasks = relationship(
        "Subtask",
        back_populates="task",
        order_by="Subtask.order",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_tasks_project_status", "project_id", "status"),
    )


class Subtask(Base):
    __tablename__ = "subtasks"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    task_id = Column(GUID(), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    completed = Column(Boolean, default=False)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="subtasks")
