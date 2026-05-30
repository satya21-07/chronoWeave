  import { Component, inject, OnInit, OnDestroy } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { ActivatedRoute, RouterModule } from '@angular/router';
  import { FormsModule } from '@angular/forms';
  import { ProjectService } from '../../services/project.service';
  import { TaskService } from '../../services/task.service';
  import { AuthService } from '../../services/auth.service';
  import { WebSocketService } from '../../services/websocket.service';
  import { ToastService } from '../../services/toast.service';
  import { DependencyGraphComponent } from '../../components/graph/dependency-graph.component';
  import { TaskDetailsComponent } from '../../components/tasks/task-details.component';
  import { Task } from '../../models/interfaces';
  import { Subscription } from 'rxjs';

  @Component({
    selector: 'app-project-board',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, DependencyGraphComponent, TaskDetailsComponent],
    templateUrl: './project-board.component.html',
    styleUrls: ['./project-board.component.css']
  })
  export class ProjectBoardComponent implements OnInit, OnDestroy {
    /**
     * Project board container that manages the task graph and task details pane.
     * Handles theme toggling, task creation, and websocket sync for the current project.
     */
    projectId!: string;
    isCreateModalOpen = false;
    isSubmitting = false;
    isDarkTheme = !document.body.classList.contains('light-theme');
    newTask: any = { title: '', description: '', priority: 'MEDIUM', estimated_hours: null, dependency_ids: [], assigned_user: null, subtasks: [] };
    private subtaskIdCounter = 0;
    
    projectService = inject(ProjectService);
    taskService = inject(TaskService);
    authService = inject(AuthService);
    private wsService = inject(WebSocketService);
    private route = inject(ActivatedRoute);
    private toastService = inject(ToastService);
    private sub!: Subscription;

    ngOnInit() {
      this.sub = this.route.paramMap.subscribe(params => {
        this.projectId = params.get('id')!;
        if (this.projectId) {
          this.projectService.getProject(this.projectId).subscribe();
          this.taskService.loadTasks(this.projectId);
          this.wsService.connect(this.projectId);
        }
      });
    }

    ngOnDestroy() {
      if (this.sub) this.sub.unsubscribe();
      this.wsService.disconnect();
      this.taskService.selectTask(null);
    }

    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
      if (this.isDarkTheme) {
        document.body.classList.remove('light-theme');
      } else {
        document.body.classList.add('light-theme');
      }
    }

    onTaskSelected(task: Task | undefined) {
      if (!task) {
        this.taskService.selectTask(null);
        return;
      }

      this.taskService.loadTask(task.id);
    }

    onCreateDependency(event: {source: string, target: string}) {
      this.taskService.addDependency(event.source, event.target).subscribe({
        next: () => this.toastService.success('Dependency added'),
        // error handled by interceptor
      });
    }

    addSubtask() {
      this.newTask.subtasks.push({ id: `new-subtask-${Date.now()}-${this.subtaskIdCounter++}`, title: '' });
    }

    removeSubtask(index: number) {
      this.newTask.subtasks.splice(index, 1);
    }

    trackBySubtask(_index: number, item: any) {
      return item.id;
    }

    createTask() {
      this.isSubmitting = true;
      
      // Position new task in center of view (roughly)
      const subtaskPayload = (this.newTask.subtasks || [])
        .map((s: any, index: number) => ({ title: s.title || '', completed: false, order: index }))
        .filter((sub: any) => sub.title.trim().length > 0);

      const payload = {
        ...this.newTask,
        subtasks: subtaskPayload,
        position_x: 400 + Math.random() * 100,
        position_y: 300 + Math.random() * 100
      };
      
      const dependencyIds = payload.dependency_ids || [];
      delete payload.dependency_ids;


      this.taskService.createTask(this.projectId, payload).subscribe({
        next: (createdTask) => {
          // Add dependencies if any
          if (dependencyIds.length > 0) {
            dependencyIds.forEach((depId: string) => {
              this.taskService.addDependency(createdTask.id, depId).subscribe();
            });
          }

          // if (subtaskPayload.length > 0) {
          //   this.taskService.createSubtasks(createdTask.id, subtaskPayload).subscribe({
          //     error: () => {
          //       this.taskService.addSubtasksLocal(createdTask.id, subtaskPayload.map((sub: any) => sub.title));
          //     }
          //   });
          // }
          
          this.isSubmitting = false;
          this.isCreateModalOpen = false;
          this.newTask = { title: '', description: '', priority: 'MEDIUM', estimated_hours: null, dependency_ids: [], assigned_user: null, subtasks: [] };
          this.toastService.success('Task created');
        },
        error: () => this.isSubmitting = false
      });
    }
  }
