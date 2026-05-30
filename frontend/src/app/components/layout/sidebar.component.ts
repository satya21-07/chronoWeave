import { Component, inject, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit, OnDestroy {
  /** Project service used to load project navigation links. */
  projectService = inject(ProjectService);

  /** Authentication service to display current user in the sidebar. */
  authService = inject(AuthService);

  /** Whether the sidebar is currently collapsed. */
  isCollapsed = false;
  /** When collapsed, controls whether the projects popover is visible */
  showCollapsedProjects = false;
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

  ngOnDestroy() {
    document.removeEventListener('click', this._docClickHandler);
  }
}

