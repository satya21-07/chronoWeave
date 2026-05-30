# FlowBoard - Visual Task Dependency Manager

FlowBoard is a modern, premium SaaS application for project management that visually maps out task dependencies using an interactive node-based graph.

## Features

- **Interactive Dependency Graph:** View and manage tasks as a directed graph powered by D3.js.
- **Cycle Detection:** Built-in graph algorithms prevent cyclic dependencies (e.g., A -> B -> A).
- **Critical Path Calculation:** Automatically calculate and highlight the critical path (longest chain) to project completion.
- **Real-Time Collaboration:** Fast WebSocket integration to broadcast changes (tasks created, moved, updated) to all users connected to the same project instantly.
- **Dependency Propagation:** When a parent task's status changes, dependent tasks automatically update (e.g., become BLOCKED if parents aren't COMPLETED).
- **Advanced Analytics:** Dashboard with KPI cards, donut charts, and timeline area charts via ApexCharts.
- **Premium UI:** Glassmorphism styling, dark mode out-of-the-box, rich Tailwind CSS animations, and drag-and-drop mechanics.

## Tech Stack

### Frontend
- **Angular 17** (Standalone Components, Signals, RxJS)
- **Tailwind CSS** (Custom Dark Theme, Glass UI)
- **D3.js** (Graph rendering and physics)
- **ApexCharts** (Analytics dashboards)

### Backend
- **Python / FastAPI** (Async endpoints, WebSocket support)
- **PostgreSQL / SQLAlchemy** (Async driver, UUIDs)
- **JWT Authentication**

### Deployment
- **Docker & Docker Compose**

---

## Setup & Run Instructions

### The Easy Way (Docker)

Ensure you have Docker and Docker Compose installed.

1. Navigate to the project root:
   ```bash
   cd flowboard
   ```
2. Run Docker Compose:
   ```bash
   docker-compose up --build
   ```
3. The app will be available at: `http://localhost:80`
   The backend API is accessible at: `http://localhost:8000/api`

*Note: The first time the backend boots, it will automatically run migrations and seed demo data (Demo user & complete E-commerce project graph).*

### Demo Credentials
- **Email:** `demo@flowboard.io`
- **Password:** `demo1234`

### Development (Local)

**Backend:**
```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```
Frontend will be at `http://localhost:4200`.

---
## Architecture Highlights

- **State Management:** Fully reactive UI using Angular Signals for local state (`AuthService`, `ProjectService`, `TaskService`).
- **Graph Algorithm:** DFS cycle detection runs on the backend prior to dependency insertion. Topological Sort and DP compute the critical path.
- **Component Design:** Clean module isolation and atomic component structure following Angular 17 best practices.

*Built with passion by Antigravity.*
