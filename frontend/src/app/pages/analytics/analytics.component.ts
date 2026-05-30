import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgApexchartsModule, ChartComponent } from 'ng-apexcharts';
import { TaskService } from '../../services/task.service';
import { ProjectService } from '../../services/project.service';
import { Analytics } from '../../models/interfaces';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule],
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css']
})
export class AnalyticsComponent implements OnInit {
  projectId!: string;
  data: Analytics | null = null;
  loading = true;

  projectService = inject(ProjectService);
  private taskService = inject(TaskService);
  private route = inject(ActivatedRoute);

  public statusChartOptions: any = {};
  public lineChartOptions: any = {};

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.projectId = params.get('id')!;
      if (this.projectId) {
        if (!this.projectService.currentProject()) {
          this.projectService.getProject(this.projectId).subscribe();
        }
        
        this.taskService.getAnalytics(this.projectId).subscribe({
          next: (data) => {
            this.data = data;
            this.loading = false;
            this.initCharts();
          },
          error: () => this.loading = false
        });
      }
    });
  }

  private initCharts() {
    if (!this.data) return;

    // Status Donut Chart
    this.statusChartOptions = {
      series: [
        this.data.completed_tasks, 
        this.data.in_progress_tasks, 
        this.data.blocked_tasks, 
        this.data.not_started_tasks
      ],
      chart: { type: 'donut', height: 320, background: 'transparent' },
      labels: ['Completed', 'In Progress', 'Blocked', 'Not Started'],
      colors: ['#22c55e', '#f59e0b', '#ef4444', '#6b6b8a'],
      stroke: { show: true, colors: ['#141425'], width: 2 },
      legend: { position: 'bottom', labels: { colors: '#9999b8' } },
      tooltip: { theme: 'dark' }
    };

    // Weekly Line Chart
    this.lineChartOptions = {
      series: [{
        name: 'Completed Tasks',
        data: this.data.weekly_completed.map(w => w.completed)
      }],
      chart: { type: 'area', height: 320, background: 'transparent', toolbar: { show: false } },
      colors: ['#6366f1'],
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] }
      },
      stroke: { curve: 'smooth', width: 3 },
      xaxis: {
        categories: this.data.weekly_completed.map(w => w.week),
        labels: { style: { colors: '#9999b8' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: { style: { colors: '#9999b8' } }
      },
      theme: { mode: 'dark' },
      tooltip: { theme: 'dark' }
    };
  }
}
