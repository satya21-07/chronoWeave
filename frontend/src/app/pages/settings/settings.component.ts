import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {

  authService = inject(AuthService);

  previewAvatar: string | ArrayBuffer | null = null;

  onAvatarSelected(event: Event) {

    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Only image validation
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {

      this.previewAvatar = reader.result;

      // Update user avatar
      const currentUser = this.authService.user();

      if (currentUser) {

        const updatedUser = {
          ...currentUser,
          avatar: reader.result as string
        };

        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Update signal/state
        this.authService.setUser(updatedUser);
      }
    };

    reader.readAsDataURL(file);
  }
}