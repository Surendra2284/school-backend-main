import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../shared/auth-service';
import { ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  loginForm!: FormGroup; // Form to collect login data
  serverMessage: string = ''; // Message from server (error/success)
  isError: boolean = false; // Flag to indicate an error state
  private authSub!: Subscription; // Subscription for authentication observer
  passwordVisible: boolean = false;
  constructor(private authService: AuthService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.initializeForm(); // Initialize the login form
    this.subscribeToAuthChanges(); // Subscribe to authentication changes
  }

  ngOnDestroy(): void {
    // Unsubscribe to avoid memory leaks
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }
  
  onSubmit(): void {
    if (this.loginForm.valid) {
      const { username, password, role } = this.loginForm.value;
      this.authService.loginUser(username, password, role);
    } else {
      this.setErrorMessage('Please fill all required fields correctly.');
    }
  }

  private initializeForm(): void {
    // Create and configure login form group
    this.loginForm = new FormGroup({
      username: new FormControl('', [Validators.required]),
      password: new FormControl('', [Validators.required]),
      role: new FormControl('', [Validators.required])
    });
  }

  private subscribeToAuthChanges(): void {
    this.authSub = this.authService.getAuthenticatedSub().subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          this.clearErrorMessage();
        } else {
          this.setErrorMessage(this.authService.errorMessage || 'Login failed. Please try again.');
          this.loginForm.reset();
        }
      },
      error: (error) => {
        // Log errors for debugging
        console.error('Error in authentication subscription:', error);
        this.setErrorMessage('An unexpected error occurred.');
      }
    });
  }

  private setErrorMessage(message: string): void {
    this.isError = true;
    this.serverMessage = message;
    this.cdr.detectChanges(); // Trigger change detection manually
  }

  private clearErrorMessage(): void {
    this.isError = false;
    this.serverMessage = '';
    this.cdr.detectChanges();
  }
  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }
  

}

    
