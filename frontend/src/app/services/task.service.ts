import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Task, Analytics } from '../models/interfaces';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private _tasks = signal<Task[]>([]);
  private _selectedTask = signal<Task | null>(null);
  private _criticalPath = signal<string[]>([]);
  private _loading = signal(false);

  tasks = this._tasks.asReadonly();
  selectedTask = this._selectedTask.asReadonly();
  criticalPath = this._criticalPath.asReadonly();
  loading = this._loading.asReadonly();

  constructor(private http: HttpClient) {}

  // --- Subtask helpers (frontend-first, optimistic) ---
  private genId(prefix = 'st') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  }

  /**
   * Add subtasks locally to a task. Attempts backend POST if endpoint exists,
   * but will always update local state optimistically.
   */
  addSubtasksLocal(taskId: string, titles: string[]): void {
    const newSubtasks = titles.map((t, i) => ({ id: this.genId(), title: t, completed: false, order: i }));
    this._tasks.update((list) =>
      list.map((task) => (task.id === taskId ? { ...task, subtasks: [...(task.subtasks || []), ...newSubtasks] } : task))
    );

    const updated = this._tasks().find((t) => t.id === taskId) || null;
    if (updated && this._selectedTask()?.id === taskId) {
      this._selectedTask.set(updated);
    }
  }

  createSubtasks(taskId: string, subtasks: Array<{ title: string; completed?: boolean; order?: number }>) {
    // Use updateTask instead since the backend consolidated this into the task update route
    return this.updateTask(taskId, { subtasks }).pipe(
      tap((updated) => {
        if (this._selectedTask()?.id === taskId) {
          this._selectedTask.set(updated);
        }
      })
    );
  }

  updateSubtask(taskId: string, subtaskId: string, data: Partial<any>): Observable<Task> {
    return this.http.put<Task>(`${environment.apiUrl}/tasks/${taskId}/subtasks/${subtaskId}`, data).pipe(
      tap((updated) => {
        this._tasks.update((list) => list.map((t) => (t.id === taskId ? updated : t)));
        if (this._selectedTask()?.id === taskId) this._selectedTask.set(updated);
      })
    );
  }

  toggleSubtaskCompletionLocal(taskId: string, subtaskId: string, completed: boolean): void {
    this._tasks.update((list) =>
      list.map((task) => {
        if (task.id !== taskId) return task;
        const subs = (task.subtasks || []).map((s) => (s.id === subtaskId ? { ...s, completed } : s));
        // compute progress from subtasks
        const total = subs.length || 0;
        const done = subs.filter((s) => s.completed).length;
        const progress = total === 0 ? task.progress ?? 0 : Math.floor((done / total) * 100);
        return { ...task, subtasks: subs, progress };
      })
    );

    this.updateSubtask(taskId, subtaskId, { completed }).subscribe({
      error: () => {
        // ignore backend failure; local state is still preserved
      }
    });

    // Ensure selectedTask signal is updated if the toggled task is currently selected
    const updated = this._tasks().find((t) => t.id === taskId) || null;
    if (updated && this._selectedTask()?.id === taskId) {
      this._selectedTask.set(updated);
    }
  }

  loadTasks(projectId: string): void {
    this._loading.set(true);
    this.http.get<Task[]>(`${environment.apiUrl}/tasks/project/${projectId}`).subscribe({
      next: (tasks) => {
        this._tasks.set(tasks);
        this._loading.set(false);
        this.loadCriticalPath(projectId);
      },
      error: () => this._loading.set(false),
    });
  }

  loadTask(taskId: string): void {
    this.http.get<Task>(`${environment.apiUrl}/tasks/${taskId}`).subscribe({
      next: (task) => {
        this._tasks.update((list) => list.map((t) => (t.id === task.id ? task : t)));
        this._selectedTask.set(task);
      },
      error: () => {},
    });
  }

  createTask(projectId: string, data: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(`${environment.apiUrl}/tasks/project/${projectId}`, data).pipe(
      tap((task) => this._tasks.update((list) => [...list, task]))
    );
  }

  updateTask(taskId: string, data: Partial<Task> | Record<string, any>): Observable<Task> {
    return this.http.put<Task>(`${environment.apiUrl}/tasks/${taskId}`, data).pipe(
      tap((updated) => {
        this._tasks.update((list) => list.map((t) => (t.id === taskId ? updated : t)));
        if (this._selectedTask()?.id === taskId) this._selectedTask.set(updated);
      })
    );
  }

  updateTaskPosition(taskId: string, x: number, y: number): Observable<Task> {
    return this.http
      .put<Task>(`${environment.apiUrl}/tasks/${taskId}/position`, { position_x: x, position_y: y })
      .pipe(
        tap((updated) => {
          this._tasks.update((list) => list.map((t) => (t.id === taskId ? updated : t)));
        })
      );
  }

  deleteTask(taskId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/tasks/${taskId}`).pipe(
      tap(() => {
        this._tasks.update((list) => list.filter((t) => t.id !== taskId));
        if (this._selectedTask()?.id === taskId) this._selectedTask.set(null);
      })
    );
  }

  addDependency(taskId: string, dependsOnId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/dependencies/`, {
      task_id: taskId,
      depends_on_id: dependsOnId,
    });
  }

  removeDependency(taskId: string, dependsOnId: string): Observable<any> {
    return this.http.request('delete', `${environment.apiUrl}/dependencies/`, {
      body: { task_id: taskId, depends_on_id: dependsOnId },
    });
  }

  loadCriticalPath(projectId: string): void {
    this.http
      .get<{ critical_path: string[]; length: number }>(
        `${environment.apiUrl}/dependencies/critical-path/${projectId}`
      )
      .subscribe({
        next: (res) => this._criticalPath.set(res.critical_path),
        error: () => this._criticalPath.set([]),
      });
  }

  getAnalytics(projectId: string): Observable<Analytics> {
    return this.http.get<Analytics>(`${environment.apiUrl}/analytics/${projectId}`);
  }

  selectTask(task: Task | null): void {
    this._selectedTask.set(task);
  }

  applyWsUpdate(msg: any): void {
    switch (msg.type) {
      case 'task_created':
        this._tasks.update((list) => {
          if (list.find((t) => t.id === msg.task.id)) return list;
          return [...list, msg.task];
        });
        break;
      case 'task_updated':
      case 'task_moved':
        this._tasks.update((list) => list.map((t) => (t.id === msg.task.id ? msg.task : t)));
        if (this._selectedTask()?.id === msg.task.id) this._selectedTask.set(msg.task);
        break;
      case 'task_deleted':
        this._tasks.update((list) => list.filter((t) => t.id !== msg.task_id));
        if (this._selectedTask()?.id === msg.task_id) this._selectedTask.set(null);
        break;
      case 'dependency_added':
      case 'dependency_removed':
        // Reload tasks to get updated dependency info
        const tasks = this._tasks();
        if (tasks.length > 0) {
          this.loadTasks(tasks[0].project_id);
        }
        break;
    }
  }
}
