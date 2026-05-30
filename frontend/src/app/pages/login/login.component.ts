import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  /** Login page form model. */
  email = '';
  password = '';
  
  authService = inject(AuthService);
  private router = inject(Router);

  onSubmit() {
    if (this.email && this.password) {
      this.authService.login(this.email, this.password).subscribe(() => {
        this.router.navigate(['/dashboard']);
      });
    }
  }
}
