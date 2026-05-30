import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskStatus, TaskPriority } from '../../models/interfaces';
import { TaskService } from '../../services/task.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-task-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-details.component.html',
  styleUrls: ['./task-details.component.css']
})
export class TaskDetailsComponent {
  /** Task object passed from the selected task in the board. */
  @Input() task!: Task;

  /** Event emitted when the drawer should close. */
  @Output() close = new EventEmitter<void>();

  private taskService = inject(TaskService);
  private toastService = inject(ToastService);

  isEditing = false;
  isSaving = false;
  editData: any = {};

  statuses = Object.values(TaskStatus);
  priorities = Object.values(TaskPriority);

  ngOnChanges() {
    // Reset edit mode and copy the latest task values for editing.
    this.isEditing = false;
    this.editData = { ...this.task };
  }

  saveTask() {
    this.isSaving = true;
    const update = {
      title: this.editData.title,
      description: this.editData.description,
      status: this.editData.status,
      priority: this.editData.priority,
      progress: this.editData.progress,
      due_date: this.editData.due_date,
      estimated_hours: this.editData.estimated_hours
    };

    this.taskService.updateTask(this.task.id, update).subscribe({
      next: () => {
        this.isSaving = false;
        this.isEditing = false;
        this.toastService.success('Task updated');
      },
      error: () => {
        this.isSaving = false;
      }
    });
  }

  removeDependency(depId: string) {
    this.taskService.removeDependency(this.task.id, depId).subscribe({
      next: () => this.toastService.success('Dependency removed'),
    });
  }

  deleteTask() {
    if (confirm(`Are you sure you want to delete "${this.task.title}"?`)) {
      this.taskService.deleteTask(this.task.id).subscribe({
        next: () => {
          this.toastService.success('Task deleted');
          this.close.emit();
        }
      });
    }
  }

  getStatusBadgeClass(status: string) {
    switch (status) {
      case 'COMPLETED': return 'badge-success';
      case 'IN_PROGRESS': return 'badge-warning';
      case 'BLOCKED': return 'badge-danger';
      default: return 'badge-default';
    }
  }

  getPriorityBadgeClass(priority: string) {
    switch (priority) {
      case 'CRITICAL': return 'badge-danger';
      case 'HIGH': return 'badge-warning';
      case 'MEDIUM': return 'badge-info';
      default: return 'badge-default';
    }
  }
  
  getStatusColorClass(status: string) {
    switch (status) {
      case 'COMPLETED': return 'bg-success';
      case 'IN_PROGRESS': return 'bg-warning';
      case 'BLOCKED': return 'bg-danger';
      default: return 'bg-dark-400';
    }
  }

  // Subtask UI handling
  showSubtasks = true;
  newSubtaskTitle = '';

  toggleSubtask(sub: any) {
    if (!this.task) return;
    this.taskService.toggleSubtaskCompletionLocal(this.task.id, sub.id, !sub.completed);
  }

  addSubtask() {
    const title = this.newSubtaskTitle?.trim();
    if (!title || !this.task) return;

    this.taskService.updateTask(this.task.id, {
      subtasks: [{ title, completed: false, order: (this.task.subtasks?.length || 0) }]
    }).subscribe({
      next: () => {
        this.newSubtaskTitle = '';
        this.taskService.loadTask(this.task.id);
      },
      error: () => {
        this.newSubtaskTitle = '';
      }
    });
  }

}
