"""Graph algorithms: cycle detection, dependency propagation, critical path."""
from typing import List, Dict, Set, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Task, task_dependencies


async def get_adjacency_list(db: AsyncSession, project_id: UUID) -> Dict[UUID, List[UUID]]:
    """Build adjacency list: task_id -> list of tasks it depends on."""
    result = await db.execute(
        select(Task.id).where(Task.project_id == project_id)
    )
    task_ids = [row[0] for row in result.fetchall()]

    adj: Dict[UUID, List[UUID]] = {tid: [] for tid in task_ids}

    deps_result = await db.execute(
        select(task_dependencies.c.task_id, task_dependencies.c.depends_on_id).where(
            task_dependencies.c.task_id.in_(task_ids)
        )
    )
    for task_id, depends_on_id in deps_result.fetchall():
        if task_id in adj:
            adj[task_id].append(depends_on_id)

    return adj


def detect_cycle(adj: Dict[UUID, List[UUID]], new_edge: Tuple[UUID, UUID] = None) -> bool:
    """DFS-based cycle detection. Returns True if adding new_edge would create a cycle."""
    graph = {k: list(v) for k, v in adj.items()}

    if new_edge:
        task_id, depends_on_id = new_edge
        if task_id not in graph:
            graph[task_id] = []
        if depends_on_id not in graph:
            graph[depends_on_id] = []
        graph[task_id].append(depends_on_id)

    WHITE, GRAY, BLACK = 0, 1, 2
    color: Dict[UUID, int] = {node: WHITE for node in graph}

    def dfs(node: UUID) -> bool:
        color[node] = GRAY
        for neighbor in graph.get(node, []):
            if color.get(neighbor, WHITE) == GRAY:
                return True  # Back edge = cycle
            if color.get(neighbor, WHITE) == WHITE and dfs(neighbor):
                return True
        color[node] = BLACK
        return False

    for node in graph:
        if color[node] == WHITE:
            if dfs(node):
                return True
    return False


async def propagate_blocked_status(db: AsyncSession, project_id: UUID):
    """If any dependency of a task is not COMPLETED, mark the task as BLOCKED
    (unless the task itself is already COMPLETED)."""
    result = await db.execute(
        select(Task).where(Task.project_id == project_id).options()
    )
    tasks = {t.id: t for t in result.scalars().all()}

    deps_result = await db.execute(
        select(task_dependencies.c.task_id, task_dependencies.c.depends_on_id).where(
            task_dependencies.c.task_id.in_(list(tasks.keys()))
        )
    )
    dep_map: Dict[UUID, List[UUID]] = {}
    for tid, did in deps_result.fetchall():
        dep_map.setdefault(tid, []).append(did)

    for task_id, dep_ids in dep_map.items():
        task = tasks.get(task_id)
        if not task or task.status == "COMPLETED":
            continue

        has_incomplete_dep = any(
            tasks.get(did) and tasks[did].status != "COMPLETED"
            for did in dep_ids
        )
        if has_incomplete_dep and task.status != "BLOCKED":
            task.status = "BLOCKED"
            task.progress = min(task.progress, 99)
        elif not has_incomplete_dep and task.status == "BLOCKED":
            task.status = "NOT_STARTED"

    await db.flush()


def calculate_critical_path(adj: Dict[UUID, List[UUID]], task_hours: Dict[UUID, float]) -> List[UUID]:
    """Calculate the critical path (longest weighted path) through the dependency graph.
    Uses reverse adjacency (dependents) and dynamic programming."""
    # Build reverse graph: depends_on -> list of tasks that depend on it
    reverse: Dict[UUID, List[UUID]] = {k: [] for k in adj}
    in_degree: Dict[UUID, int] = {k: 0 for k in adj}

    for task_id, deps in adj.items():
        for dep_id in deps:
            if dep_id in reverse:
                reverse[dep_id].append(task_id)
            in_degree[task_id] = in_degree.get(task_id, 0) + 1

    # Topological sort (Kahn's algorithm)
    from collections import deque
    queue = deque([n for n in adj if in_degree.get(n, 0) == 0])
    topo_order: List[UUID] = []

    while queue:
        node = queue.popleft()
        topo_order.append(node)
        for neighbor in reverse.get(node, []):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # DP for longest path
    dist: Dict[UUID, float] = {n: task_hours.get(n, 1.0) for n in adj}
    predecessor: Dict[UUID, UUID] = {}

    for node in topo_order:
        for neighbor in reverse.get(node, []):
            new_dist = dist[node] + task_hours.get(neighbor, 1.0)
            if new_dist > dist.get(neighbor, 0):
                dist[neighbor] = new_dist
                predecessor[neighbor] = node

    if not dist:
        return []

    # Trace back from the node with the longest distance
    end_node = max(dist, key=dist.get)
    path = []
    current = end_node
    while current is not None:
        path.append(current)
        current = predecessor.get(current)
    path.reverse()
    return path
