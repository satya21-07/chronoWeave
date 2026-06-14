import { Component, inject, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { AiService } from '../../services/ai.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  /** Project service used to load project navigation links. */
  projectService = inject(ProjectService);

  /** Authentication service to display current user in the sidebar. */
  authService = inject(AuthService);

  /** AI Service to trigger chatbot */
  aiService = inject(AiService);

  /** Router to navigate to new project */
  router = inject(Router);

  /** Whether the sidebar is currently collapsed. */
  isCollapsed = false;
  /** When collapsed, controls whether the projects popover is visible */
  showCollapsedProjects = false;
  
  /** Modal state for creating a new project */
  isModalOpen = false;
  newProjectTitle = 'New Project';
  isCreating = false;

  private ngZone = inject(NgZone);

  private _docClickHandler = () => {
    this.ngZone.run(() => {
      this.showCollapsedProjects = false;
    });
  };

  ngOnInit() {
    // Load the project list once when the sidebar mounts.
    this.projectService.loadProjects();
    // Close collapsed popover when clicking outside
    document.addEventListener('click', this._docClickHandler);
  }

  toggleCollapsed() {
    this.isCollapsed = !this.isCollapsed;
    if (!this.isCollapsed) this.showCollapsedProjects = false;
  }

  toggleCollapsedProjects(event?: MouseEvent) {
    event?.stopPropagation();
    this.showCollapsedProjects = !this.showCollapsedProjects;
  }

  openNewProjectModal() {
    this.newProjectTitle = 'New Project';
    this.isModalOpen = true;
  }

  closeNewProjectModal() {
    this.isModalOpen = false;
    this.isCreating = false;
  }

  confirmCreateProject() {
    if (!this.newProjectTitle.trim() || this.isCreating) return;
    
    this.isCreating = true;
    const finalTitle = this.newProjectTitle.trim();
    this.projectService.createProject(finalTitle, 'A new blank project.').subscribe({
      next: (project) => {
        this.isCreating = false;
        this.closeNewProjectModal();
        this.router.navigate(['/project', project.id]);
      },
      error: (err) => {
        this.isCreating = false;
        console.error('Failed to create project', err);
      }
    });
  }

  ngOnDestroy() {
    document.removeEventListener('click', this._docClickHandler);
  }
}

