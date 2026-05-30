import { Injectable, OnDestroy } from '@angular/core';
import { environment } from '../../environments/environment';
import { TaskService } from './task.service';

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private reconnectTimer: any;
  private projectId: string | null = null;

  constructor(private taskService: TaskService) {}

  connect(projectId: string): void {
    this.disconnect();
    this.projectId = projectId;

    const wsUrl = `${environment.wsUrl}/${projectId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => console.log('[WS] Connected to project:', projectId);

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.taskService.applyWsUpdate(msg);
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected');
      this.reconnectTimer = setTimeout(() => {
        if (this.projectId) this.connect(this.projectId);
      }, 3000);
    };

    this.ws.onerror = (err) => console.error('[WS] Error:', err);
  }

  disconnect(): void {
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.projectId = null;
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
