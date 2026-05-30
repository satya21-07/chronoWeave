import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  /** User-entered registration form values. */
  name = '';
  email = '';
  password = '';
  
  authService = inject(AuthService);
  private router = inject(Router);

  onSubmit() {
    if (this.name && this.email && this.password) {
      this.authService.register(this.name, this.email, this.password).subscribe(() => {
        this.router.navigate(['/dashboard']);
      });
    }
  }
}
