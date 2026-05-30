export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  created_at: string;
  task_count: number;
}

export interface TaskDependency {
  id: string;
  title: string;
  status: string;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  order?: number;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  due_date?: string;
  estimated_hours?: number;
  assigned_user?: string;
  position_x: number;
  position_y: number;
  created_at: string;
  dependencies: TaskDependency[];
  subtasks?: Subtask[];
  dependents: TaskDependency[];
  assignee_name?: string;
}

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Analytics {
  total_tasks: number;
  completed_tasks: number;
  blocked_tasks: number;
  in_progress_tasks: number;
  not_started_tasks: number;
  progress_percentage: number;
  critical_path_length: number;
  status_distribution: Record<string, number>;
  priority_distribution: Record<string, number>;
  weekly_completed: { week: string; completed: number }[];
}

export interface GraphEdge {
  source: string;
  target: string;
}
