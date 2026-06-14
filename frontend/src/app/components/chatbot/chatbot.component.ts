import { Component, ElementRef, ViewChild, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  projectId?: string;
  isGenerating?: boolean;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, OnDestroy {
  isOpen = false;
  messages: ChatMessage[] = [
    { role: 'assistant', content: 'Hi there! Describe a project you want to build, and I will generate a plan for you.' }
  ];
  userInput = '';
  isTyping = false;
  currentProjectId?: string;
  forceNewProject = false;

  aiService = inject(AiService);
  toastService = inject(ToastService);
  router = inject(Router);

  @ViewChild('chatContainer') chatContainer!: ElementRef;

  private subscription: any;
  private routerSubscription: any;

  ngOnInit() {
    this.subscription = this.aiService.openChatbotNewProject$.subscribe(() => {
      this.isOpen = true;
      this.startNewProject();
    });

    this.routerSubscription = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.checkCurrentProject();
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.checkCurrentProject();
      this.scrollToBottom();
    }
  }

  checkCurrentProject() {
    const match = this.router.url.match(/\/project\/([a-zA-Z0-9-]+)/);
    if (match && match[1]) {
      const newProjectId = match[1];
      if (this.currentProjectId !== newProjectId) {
        this.forceNewProject = false;
        this.currentProjectId = newProjectId;
        this.loadHistory();
      }
    } else {
      this.forceNewProject = false;
      this.currentProjectId = undefined;
      // Reset if not on a project page
      if (this.messages.length > 1 || this.messages[0].content !== 'Hi there! Describe a project you want to build, and I will generate a plan for you.') {
        this.messages = [
          { role: 'assistant', content: 'Hi there! Describe a project you want to build, and I will generate a plan for you.' }
        ];
      }
    }
  }

  loadHistory() {
    if (!this.currentProjectId) return;
    this.aiService.getProjectHistory(this.currentProjectId).subscribe({
      next: (history) => {
        if (history && history.length > 0) {
          this.messages = history.map(h => ({
            role: h.role,
            content: h.content,
            projectId: this.currentProjectId
          }));
        } else {
          this.messages = [
            { role: 'assistant', content: 'I see you are viewing a project. Tell me what tasks you want to add or modify!' }
          ];
        }
        this.scrollToBottom();
      },
      error: () => {
        console.error("Failed to load AI chat history");
      }
    });
  }

  startNewProject() {
    this.forceNewProject = true;
    this.currentProjectId = undefined;
    this.messages = [
      { role: 'assistant', content: 'Ready to create a brand new project! What would you like to build?' }
    ];
    this.scrollToBottom();
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isTyping) return;

    const prompt = this.userInput.trim();
    this.messages.push({ role: 'user', content: prompt });
    this.userInput = '';

    // Add temporary typing message
    const tempMessageIndex = this.messages.push({
      role: 'assistant',
      content: 'Generating your project plan...',
      isGenerating: true
    }) - 1;

    this.isTyping = true;
    this.scrollToBottom();

    const historyPayload = this.messages
      .filter(m => !m.isGenerating)
      .map(m => ({ role: m.role, content: m.content }));

    this.aiService.generateProject(prompt, historyPayload, this.currentProjectId).subscribe({
      next: (response) => {
        this.isTyping = false;
        // Update the temporary message
        this.messages[tempMessageIndex] = {
          role: 'assistant',
          content: `Project "${response.title}" has been created with ${response.task_count} tasks! Redirecting to canvas...`,
          projectId: response.project_id
        };
        this.toastService.success('AI project created successfully.');
        this.scrollToBottom();

        // Update currentProjectId in case it was a new project
        this.currentProjectId = response.project_id;
        this.forceNewProject = false;

        // Automatically draw/navigate to the project
        setTimeout(() => {
          // If we're already on the project page, we just close chat and let the project page reload or reflect changes
          // The graph component handles real-time updates via WebSocket or manual reload
          if (!this.router.url.includes(response.project_id)) {
            this.router.navigate(['/project', response.project_id]);
          } else {
             // Dispatch a custom event to tell the graph to refresh, or just reload the window
             window.location.reload();
          }
          this.toggleChat(); // close chat
        }, 2000);
      },
      error: () => {
        this.isTyping = false;
        this.messages[tempMessageIndex] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error while generating the project. Please try again.'
        };
        this.toastService.error('Failed to generate project.');
        this.scrollToBottom();
      }
    });
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }
}
