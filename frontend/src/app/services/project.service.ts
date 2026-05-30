import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Project } from '../models/interfaces';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private _projects = signal<Project[]>([]);
  private _currentProject = signal<Project | null>(null);
  private _loading = signal(false);

  projects = this._projects.asReadonly();
  currentProject = this._currentProject.asReadonly();
  loading = this._loading.asReadonly();

  constructor(private http: HttpClient) {}

  loadProjects(): void {
    this._loading.set(true);
    this.http.get<Project[]>(`${environment.apiUrl}/projects/`).subscribe({
      next: (projects) => {
        this._projects.set(projects);
        this._loading.set(false);
      },
      error: () => this._loading.set(false),
    });
  }

  getProject(id: string): Observable<Project> {
    return this.http.get<Project>(`${environment.apiUrl}/projects/${id}`).pipe(
      tap((p) => this._currentProject.set(p))
    );
  }

  createProject(title: string, description: string): Observable<Project> {
    return this.http.post<Project>(`${environment.apiUrl}/projects/`, { title, description }).pipe(
      tap((p) => this._projects.update((list) => [p, ...list]))
    );
  }

  updateProject(id: string, data: Partial<Project>): Observable<Project> {
    return this.http.put<Project>(`${environment.apiUrl}/projects/${id}`, data).pipe(
      tap((updated) => {
        this._projects.update((list) => list.map((p) => (p.id === id ? updated : p)));
        if (this._currentProject()?.id === id) this._currentProject.set(updated);
      })
    );
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/projects/${id}`).pipe(
      tap(() => this._projects.update((list) => list.filter((p) => p.id !== id)))
    );
  }

  setCurrentProject(project: Project | null): void {
    this._currentProject.set(project);
  }
}
