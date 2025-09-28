import { Component, OnInit, Inject } from '@angular/core';
import { AuthService } from '../../../shared/auth-service';
import { Router } from '@angular/router';
import { StudentService, Student } from '../../../services/student.service';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-student-details',
  templateUrl: './student-details.component.html',
  styleUrls: ['./student-details.component.css']
})

export class StudentDetailsComponent implements OnInit {
  username: string = '';
  password: string = '';
  loginForm!: FormGroup; // Use definite assignment assertion operator

  constructor(
    @Inject(StudentService) private studentservice: StudentService,
    @Inject(AuthService) private authService: AuthService,
    @Inject(Router) private router: Router,
    private fb: FormBuilder
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: [''],
      password: [''],
      rememberMe: [false]
    });
  }

  //login() {
    //const { username, password } = this.loginForm.value;
    //this.authService.login(username, password).subscribe(response => {
    //  console.log('Login successful', response);
    //  this.router.navigate(['/dashboard']); // Navigate to dashboard on successful login
    //}, error => {
    //  console.error('Login failed', error);
   // });
  //}

  selectedUserChanged(event: Event): void {
    const input = event.target as HTMLInputElement;
    console.log(`User input changed: ${input.value}`);
  }
}



