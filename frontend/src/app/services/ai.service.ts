import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task } from '../models/interfaces';

export interface AiProjectCreateResponse {
  project_id: string;
  title: string;
  description?: string;
  task_count: number;
  tasks: Task[];
  raw_schema: any;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private openChatbotNewProjectSource = new Subject<void>();
  openChatbotNewProject$ = this.openChatbotNewProjectSource.asObservable();

  constructor(private http: HttpClient) {}

  triggerNewProject() {
    this.openChatbotNewProjectSource.next();
  }

  generateProject(prompt: string, history: any[] = [], project_id?: string): Observable<AiProjectCreateResponse> {
    const payload: any = { prompt, history };
    if (project_id) {
      payload.project_id = project_id;
    }
    return this.http.post<AiProjectCreateResponse>(`${environment.apiUrl}/ai/project`, payload);
  }

  getProjectHistory(project_id: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/ai/project/${project_id}/history`);
  }
}
