import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { AiService, AiProjectCreateResponse } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  /**
   * Dashboard manages the user's projects collection and provides actions
   * to create, view, and remove projects in the ChronoWeave app.
   */
  projectService = inject(ProjectService);
  authService = inject(AuthService);
  aiService = inject(AiService);
  router = inject(Router);
  private toastService = inject(ToastService);

  isCreateModalOpen = false;
  isSubmitting = false;
  newProject = { title: '', description: '' };

  ngOnInit() {
    this.projectService.loadProjects();
  }

  createProject() {
    this.isSubmitting = true;
    this.projectService.createProject(this.newProject.title, this.newProject.description).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isCreateModalOpen = false;
        this.newProject = { title: '', description: '' };
        this.toastService.success('Project created successfully');
      },
      error: () => this.isSubmitting = false
    });
  }

  deleteProject(id: string) {
    if (confirm('Are you sure you want to delete this project? All tasks will be lost.')) {
      this.projectService.deleteProject(id).subscribe({
        next: () => this.toastService.success('Project deleted'),
      });
    }
  }
}
