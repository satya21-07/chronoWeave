"""Seed demo data: user, project, tasks with dependencies."""
import uuid
from datetime import datetime, timedelta
from sqlalchemy import select
from app.database import async_session
from app.models import User, Project, Task, TaskStatus, TaskPriority, task_dependencies
from app.services import hash_password

DEMO_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEMO_PROJECT_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")

TASK_IDS = {
    "design": uuid.UUID("10000000-0000-0000-0000-000000000001"),
    "db_schema": uuid.UUID("10000000-0000-0000-0000-000000000002"),
    "auth_api": uuid.UUID("10000000-0000-0000-0000-000000000003"),
    "product_api": uuid.UUID("10000000-0000-0000-0000-000000000004"),
    "cart_api": uuid.UUID("10000000-0000-0000-0000-000000000005"),
    "order_api": uuid.UUID("10000000-0000-0000-0000-000000000006"),
    "payment": uuid.UUID("10000000-0000-0000-0000-000000000007"),
    "frontend_shell": uuid.UUID("10000000-0000-0000-0000-000000000008"),
    "product_ui": uuid.UUID("10000000-0000-0000-0000-000000000009"),
    "cart_ui": uuid.UUID("10000000-0000-0000-0000-00000000000a"),
    "checkout_ui": uuid.UUID("10000000-0000-0000-0000-00000000000b"),
    "testing": uuid.UUID("10000000-0000-0000-0000-00000000000c"),
    "deployment": uuid.UUID("10000000-0000-0000-0000-00000000000d"),
}


async def seed_data():
    async with async_session() as db:
        existing = await db.execute(select(User).where(User.id == DEMO_USER_ID))
        if existing.scalar_one_or_none():
            return  # Already seeded

        # Create demo user
        user = User(
            id=DEMO_USER_ID,
            name="Alex Morgan",
            email="demo@flowboard.io",
            hashed_password=hash_password("demo1234"),
            avatar="https://api.dicebear.com/7.x/initials/svg?seed=Alex+Morgan",
        )
        db.add(user)

        # Create demo project
        project = Project(
            id=DEMO_PROJECT_ID,
            title="E-Commerce Platform",
            description="Full-stack e-commerce application with product catalog, shopping cart, checkout, and payment processing.",
            created_by=DEMO_USER_ID,
        )
        db.add(project)
        await db.flush()

        # Create tasks
        now = datetime.utcnow()
        tasks_data = [
            {"id": TASK_IDS["design"], "title": "UI/UX Design System", "description": "Create design tokens, component library, and brand guidelines.", "status": TaskStatus.COMPLETED, "priority": TaskPriority.HIGH, "progress": 100, "estimated_hours": 24, "position_x": 100, "position_y": 300, "due_date": now + timedelta(days=3)},
            {"id": TASK_IDS["db_schema"], "title": "Database Schema Design", "description": "Design normalized PostgreSQL schema for users, products, orders, and payments.", "status": TaskStatus.COMPLETED, "priority": TaskPriority.CRITICAL, "progress": 100, "estimated_hours": 16, "position_x": 100, "position_y": 500, "due_date": now + timedelta(days=2)},
            {"id": TASK_IDS["auth_api"], "title": "Authentication API", "description": "Implement JWT auth with register, login, password reset, and OAuth2.", "status": TaskStatus.COMPLETED, "priority": TaskPriority.CRITICAL, "progress": 100, "estimated_hours": 20, "position_x": 350, "position_y": 400, "due_date": now + timedelta(days=5)},
            {"id": TASK_IDS["product_api"], "title": "Product Catalog API", "description": "CRUD for products with search, filtering, categories, and image upload.", "status": TaskStatus.IN_PROGRESS, "priority": TaskPriority.HIGH, "progress": 65, "estimated_hours": 24, "position_x": 600, "position_y": 250, "due_date": now + timedelta(days=8)},
            {"id": TASK_IDS["cart_api"], "title": "Shopping Cart API", "description": "Cart management with add/remove items, quantity updates, and pricing.", "status": TaskStatus.IN_PROGRESS, "priority": TaskPriority.HIGH, "progress": 40, "estimated_hours": 16, "position_x": 600, "position_y": 500, "due_date": now + timedelta(days=10)},
            {"id": TASK_IDS["order_api"], "title": "Order Management API", "description": "Order creation, status tracking, history, and admin management.", "status": TaskStatus.NOT_STARTED, "priority": TaskPriority.HIGH, "progress": 0, "estimated_hours": 20, "position_x": 850, "position_y": 400, "due_date": now + timedelta(days=14)},
            {"id": TASK_IDS["payment"], "title": "Payment Integration", "description": "Stripe payment processing with webhooks and refund handling.", "status": TaskStatus.NOT_STARTED, "priority": TaskPriority.CRITICAL, "progress": 0, "estimated_hours": 28, "position_x": 1100, "position_y": 400, "due_date": now + timedelta(days=18)},
            {"id": TASK_IDS["frontend_shell"], "title": "Frontend App Shell", "description": "Angular app setup with routing, layouts, shared components, and state management.", "status": TaskStatus.COMPLETED, "priority": TaskPriority.HIGH, "progress": 100, "estimated_hours": 12, "position_x": 350, "position_y": 150, "due_date": now + timedelta(days=4)},
            {"id": TASK_IDS["product_ui"], "title": "Product Pages UI", "description": "Product listing, detail page, search results, and category browsing.", "status": TaskStatus.BLOCKED, "priority": TaskPriority.MEDIUM, "progress": 20, "estimated_hours": 20, "position_x": 850, "position_y": 150, "due_date": now + timedelta(days=12)},
            {"id": TASK_IDS["cart_ui"], "title": "Shopping Cart UI", "description": "Cart page with item list, quantity controls, and order summary.", "status": TaskStatus.BLOCKED, "priority": TaskPriority.MEDIUM, "progress": 0, "estimated_hours": 14, "position_x": 850, "position_y": 600, "due_date": now + timedelta(days=15)},
            {"id": TASK_IDS["checkout_ui"], "title": "Checkout Flow UI", "description": "Multi-step checkout with address, shipping, payment, and confirmation.", "status": TaskStatus.NOT_STARTED, "priority": TaskPriority.HIGH, "progress": 0, "estimated_hours": 24, "position_x": 1100, "position_y": 200, "due_date": now + timedelta(days=20)},
            {"id": TASK_IDS["testing"], "title": "Integration Testing", "description": "End-to-end tests, API tests, and UI component tests.", "status": TaskStatus.NOT_STARTED, "priority": TaskPriority.MEDIUM, "progress": 0, "estimated_hours": 30, "position_x": 1350, "position_y": 300, "due_date": now + timedelta(days=24)},
            {"id": TASK_IDS["deployment"], "title": "Production Deployment", "description": "Docker setup, CI/CD pipeline, monitoring, and production launch.", "status": TaskStatus.NOT_STARTED, "priority": TaskPriority.LOW, "progress": 0, "estimated_hours": 16, "position_x": 1600, "position_y": 400, "due_date": now + timedelta(days=28)},
        ]

        for td in tasks_data:
            task = Task(project_id=DEMO_PROJECT_ID, assigned_user=DEMO_USER_ID, **td)
            db.add(task)

        await db.flush()

        # Create dependencies (edges in the graph)
        dep_edges = [
            (TASK_IDS["auth_api"], TASK_IDS["db_schema"]),       # Auth depends on DB
            (TASK_IDS["product_api"], TASK_IDS["auth_api"]),     # Product API depends on Auth
            (TASK_IDS["product_api"], TASK_IDS["db_schema"]),    # Product API depends on DB
            (TASK_IDS["cart_api"], TASK_IDS["auth_api"]),        # Cart depends on Auth
            (TASK_IDS["cart_api"], TASK_IDS["product_api"]),     # Cart depends on Product API
            (TASK_IDS["order_api"], TASK_IDS["cart_api"]),       # Order depends on Cart
            (TASK_IDS["payment"], TASK_IDS["order_api"]),        # Payment depends on Order
            (TASK_IDS["frontend_shell"], TASK_IDS["design"]),    # Frontend depends on Design
            (TASK_IDS["product_ui"], TASK_IDS["frontend_shell"]),# Product UI depends on Shell
            (TASK_IDS["product_ui"], TASK_IDS["product_api"]),   # Product UI depends on API
            (TASK_IDS["cart_ui"], TASK_IDS["frontend_shell"]),   # Cart UI depends on Shell
            (TASK_IDS["cart_ui"], TASK_IDS["cart_api"]),         # Cart UI depends on Cart API
            (TASK_IDS["checkout_ui"], TASK_IDS["cart_ui"]),      # Checkout depends on Cart UI
            (TASK_IDS["checkout_ui"], TASK_IDS["payment"]),      # Checkout depends on Payment
            (TASK_IDS["testing"], TASK_IDS["product_ui"]),       # Testing depends on Product UI
            (TASK_IDS["testing"], TASK_IDS["checkout_ui"]),      # Testing depends on Checkout
            (TASK_IDS["deployment"], TASK_IDS["testing"]),       # Deploy depends on Testing
        ]

        for task_id, dep_id in dep_edges:
            await db.execute(
                task_dependencies.insert().values(task_id=task_id, depends_on_id=dep_id)
            )

        await db.commit()
        print("✓ Demo data seeded successfully")
