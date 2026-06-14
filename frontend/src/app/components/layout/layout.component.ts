import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { ChatbotComponent } from '../chatbot/chatbot.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ChatbotComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent {
  /**
   * Layout wrapper that renders the sidebar and top navigation.
   * This component is the authenticated page shell for protected routes.
   */
}

