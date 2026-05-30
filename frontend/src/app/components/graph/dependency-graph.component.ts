import { Component, ElementRef, Input, OnChanges, SimpleChanges, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { Task, TaskStatus } from '../../models/interfaces';
import { TaskService } from '../../services/task.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-dependency-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dependency-graph.component.html',
  styleUrls: ['./dependency-graph.component.css']
})
/**
 * Visual dependency graph powered by D3 and task interaction events.
 */
export class DependencyGraphComponent implements OnChanges {
  @Input() tasks: Task[] = [];
  @Input() criticalPath: string[] = [];
  @Output() taskSelected = new EventEmitter<Task>();
  @Output() createDependency = new EventEmitter<{source: string, target: string}>();

  private el = inject(ElementRef);
  private taskService = inject(TaskService);
  private toastService = inject(ToastService);
  
  private svg: any;
  private g: any;
  private zoom: any;
  private nodes: any[] = [];
  private links: any[] = [];
  
  // Interaction state
  private dragLine: any;
  private sourceNode: any = null;
  
  // Project / Reset tracking
  private isFirstLoad = true;
  private currentProjectId: string | null = null;
  isHelpOpen = false;

  ngAfterViewInit() {
    this.initGraph();
  }

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['tasks'] || changes['criticalPath']) && this.svg) {
      this.updateGraph();
      
      const firstTask = this.tasks[0];
      const newProjectId = firstTask ? firstTask.project_id : null;
      
      if (this.isFirstLoad || (newProjectId && newProjectId !== this.currentProjectId)) {
        this.isFirstLoad = false;
        this.currentProjectId = newProjectId;
        // Wait for DOM layout to settle
        setTimeout(() => this.resetZoom(), 500);
      }
    }
  }

  toggleHelp() {
    this.isHelpOpen = !this.isHelpOpen;
  }

  private initGraph() {
    const container = this.el.nativeElement.querySelector('svg');
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.svg = d3.select(container);
    
    // Setup Zoom
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        this.g.attr('transform', event.transform);
      });
      
    this.svg.call(this.zoom);

    // Arrow markers
    const defs = this.svg.append('defs');
    
    // Normal arrow
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28) // Offset for node radius
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .style('fill', 'var(--color-dark-400)');

    // Critical path arrow
    defs.append('marker')
      .attr('id', 'arrow-critical')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 28)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#ef4444');

    this.g = this.svg.append('g');
    
    // Drag line for creating dependencies
    this.dragLine = this.g.append('path')
      .attr('class', 'drag-line hidden')
      .attr('d', 'M0,0L0,0')
      .style('stroke', '#6366f1')
      .style('stroke-width', 2)
      .style('stroke-dasharray', '5,5')
      .style('fill', 'none');

    // Setup background click to deselect
    this.svg.on('click', (event: any) => {
      if (event.target.tagName === 'svg') {
        this.taskSelected.emit(undefined);
      }
    });
    
    // SVG mousemove for dependency creation
    this.svg.on('mousemove', (event: any) => {
      if (!this.sourceNode) return;
      const [x, y] = d3.pointer(event, this.g.node());
      this.dragLine.attr('d', `M${this.sourceNode.x},${this.sourceNode.y}L${x},${y}`);
    });

    this.svg.on('mouseup', () => {
      if (this.sourceNode) {
        this.dragLine.classed('hidden', true);
        this.sourceNode = null;
      }
    });

    if (this.tasks.length > 0) {
      this.updateGraph();
      // Initial center
      setTimeout(() => this.resetZoom(), 100);
    }
  }

  private updateGraph() {
    this.nodes = this.tasks.map(t => ({
      ...t,
      x: t.position_x,
      y: t.position_y,
      radius: 24
    }));

    this.links = [];
    this.tasks.forEach(task => {
      task.dependencies.forEach(dep => {
        const source = this.nodes.find(n => n.id === dep.id); // task depends on dep -> arrow from dep to task
        const target = this.nodes.find(n => n.id === task.id);
        if (source && target) {
          const isCritical = this.criticalPath.includes(source.id) && this.criticalPath.includes(target.id);
          this.links.push({ source, target, isCritical });
        }
      });
    });

    this.render();
  }

  private render() {
    // Links
    const link = this.g.selectAll('.link')
      .data(this.links, (d: any) => `${d.source.id}-${d.target.id}`);

    link.exit().remove();

    const linkEnter = link.enter().append('path')
      .attr('class', 'link')
      .attr('fill', 'none');

    const linkMerge = linkEnter.merge(link)
      .style('stroke', (d: any) => d.isCritical ? 'var(--danger)' : 'var(--color-dark-400)')
      .attr('stroke-width', (d: any) => d.isCritical ? 3 : 2)
      .attr('marker-end', (d: any) => d.isCritical ? 'url(#arrow-critical)' : 'url(#arrow)')
      .style('opacity', (d: any) => d.isCritical ? 1 : 0.6)
      .attr('d', (d: any) => this.linkPath(d.source, d.target));

    // Nodes
    const node = this.g.selectAll('.node')
      .data(this.nodes, (d: any) => d.id);

    node.exit().remove();

    const nodeEnter = node.enter().append('g')
      .attr('class', 'node cursor-pointer')
      .call(d3.drag()
        .on('start', (e: any, d: any) => this.dragStarted(e, d))
        .on('drag', (e: any, d: any) => this.dragged(e, d))
        .on('end', (e: any, d: any) => this.dragEnded(e, d))
      )
      .on('click', (e: any, d: any) => {
        if (e.defaultPrevented) return; // dragged
        const task = this.tasks.find((task) => task.id === d.id) || d;
        this.taskSelected.emit(task);
      });

    // Node outer circle (status color)
    nodeEnter.append('circle')
      .attr('class', 'node-bg')
      .attr('r', 24)
      .style('fill', 'var(--color-dark-700)')
      .attr('stroke-width', 3);

    // Node inner circle (glass effect)
    nodeEnter.append('circle')
      .attr('r', 20)
      .style('fill', 'var(--color-dark-600)')
      .attr('opacity', 0.8);
      
    // Text initial
    nodeEnter.append('text')
      .attr('class', 'node-icon')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('fill', 'var(--color-dark-50)')
      .attr('font-size', '12px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', 'bold');

    // Label
    nodeEnter.append('text')
      .attr('class', 'node-label')
      .attr('y', 40)
      .attr('text-anchor', 'middle')
      .style('fill', 'var(--text-primary)')
      .attr('font-size', '12px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-weight', '500')
      .style('text-shadow', '0px 1px 3px var(--bg-primary), 0px 1px 3px var(--bg-primary), 0px -1px 3px var(--bg-primary)');

    // Drop target area for dependencies (covers the entire node)
    nodeEnter.append('circle')
      .attr('r', 36) // Larger than the node itself
      .attr('fill', 'transparent')
      .on('mouseup', (e: any, d: any) => {
        if (this.sourceNode && this.sourceNode.id !== d.id) {
          this.createDependency.emit({ source: this.sourceNode.id, target: d.id });
          this.dragLine.classed('hidden', true);
          this.sourceNode = null;
        }
      });

    // Connection port (bottom) - much larger invisible hit area for easy grabbing
    const portGroup = nodeEnter.append('g')
      .attr('class', 'port-group')
      .attr('transform', 'translate(0, 24)')
      .on('mousedown', (e: any, d: any) => {
        e.stopPropagation(); // Prevents dragging the node itself
        this.sourceNode = d;
        this.dragLine
          .classed('hidden', false)
          .attr('d', `M${d.x},${d.y}L${d.x},${d.y}`);
      });

    // Visible dot for the port (permanently visible but subtle)
    portGroup.append('circle')
      .attr('class', 'port-dot')
      .attr('r', 6)
      .attr('fill', '#6366f1')
      .attr('stroke', '#0a0a14')
      .attr('stroke-width', 2)
      .attr('opacity', 0.6);

    // Invisible hit area (much larger)
    portGroup.append('circle')
      .attr('r', 16)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair');

    nodeEnter.on('mouseenter', function(this: any) {
      d3.select(this).select('.port-dot')
        .transition()
        .duration(200)
        .attr('opacity', 1)
        .attr('r', 10);
    })
    .on('mouseleave', function(this: any) {
      d3.select(this).select('.port-dot')
        .transition()
        .duration(200)
        .attr('opacity', 0.6)
        .attr('r', 6);
    });

    const nodeMerge = nodeEnter.merge(node)
      .attr('transform', (d: any) => `translate(${d.x},${d.y})`);

    // Update node styles based on status and selection
    const selectedId = this.taskService.selectedTask()?.id;

    nodeMerge.select('.node-bg')
      .attr('stroke', (d: any) => this.getStatusColor(d.status))
      .style('filter', (d: any) => d.id === selectedId ? `drop-shadow(0 0 10px ${this.getStatusColor(d.status)})` : 'none');

    nodeMerge.select('.node-icon')
      .text((d: any) => this.getInitials(d.title));

    nodeMerge.select('.node-label')
      .text((d: any) => d.title.length > 20 ? d.title.substring(0, 18) + '...' : d.title)
      .attr('font-weight', (d: any) => d.id === selectedId ? 'bold' : 'normal')
      .attr('fill', (d: any) => d.id === selectedId ? '#fff' : '#e0e0eb');
  }

  private linkPath(source: any, target: any) {
    // Curved path
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Curve factor
    return `M${source.x},${source.y}A${dr},${dr} 0 0,1 ${target.x},${target.y}`;
  }

  private dragStarted(event: any, d: any) {
    d3.select(event.sourceEvent.target.parentNode).raise();
  }

  private dragged(event: any, d: any) {
    d.x = event.x;
    d.y = event.y;
    
    // Update this node
    d3.select(event.sourceEvent.target.parentNode)
      .attr('transform', `translate(${d.x},${d.y})`);
      
    // Update connected links
    this.g.selectAll('.link')
      .filter((l: any) => l.source.id === d.id || l.target.id === d.id)
      .attr('d', (l: any) => this.linkPath(l.source, l.target));
  }

  private dragEnded(event: any, d: any) {
    // Save new position
    this.taskService.updateTaskPosition(d.id, d.x, d.y).subscribe({
      error: () => this.toastService.error('Failed to save task position')
    });
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return '#22c55e'; // success
      case 'IN_PROGRESS': return '#f59e0b'; // warning
      case 'BLOCKED': return '#ef4444'; // danger
      default: return '#6b6b8a'; // muted
    }
  }

  private getInitials(title: string): string {
    return title.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  zoomIn() { this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.3); }
  zoomOut() { this.svg.transition().duration(300).call(this.zoom.scaleBy, 0.7); }
  
  resetZoom() {
    if (this.nodes.length === 0) return;
    
    // Calculate bounding box
    const xExt = d3.extent(this.nodes, (d: any) => d.x) as [number, number];
    const yExt = d3.extent(this.nodes, (d: any) => d.y) as [number, number];
    
    const container = this.el.nativeElement.querySelector('svg');
    let width = container ? container.clientWidth : 0;
    let height = container ? container.clientHeight : 0;
    
    if (!width || !height) {
      width = window.innerWidth || 800;
      height = window.innerHeight || 600;
    }
    
    const dx = xExt[1] - xExt[0];
    const dy = yExt[1] - yExt[0];
    const x = (xExt[0] + xExt[1]) / 2;
    const y = (yExt[0] + yExt[1]) / 2;
    
    const scaleX = dx === 0 ? 0 : dx / width;
    const scaleY = dy === 0 ? 0 : dy / height;
    const maxScaleFactor = Math.max(scaleX, scaleY);
    
    const scale = maxScaleFactor === 0 ? 1 : Math.max(0.2, Math.min(1.5, 0.9 / maxScaleFactor));
    const translate = [width / 2 - scale * x, height / 2 - scale * y];
    
    this.svg.transition().duration(750).call(
      this.zoom.transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
  }
}
