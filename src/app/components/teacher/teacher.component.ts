import { TeacherService } from '../../services/teacher.service';
import { Teacher } from '../models/Teacher';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../shared/auth-service';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
 const TeacherUrl= `${environment.apiUrl}/teachers`;
@Component({
  selector: 'app-teacher',
  templateUrl: './teacher.component.html',
  styleUrls: ['./teacher.component.css'],
})
export class TeacherComponent implements OnInit, OnDestroy {
  teacherForm: FormGroup;
  teachers: Teacher[] = [];
  isEdit: boolean = false;
  errorMessage: string = ''; // Error message for API calls
  currentTeacherId: string | null = null;
  userAuthenticated: boolean = false; // Authentication status
  authenticatedSub: Subscription = new Subscription();

  constructor(
    private fb: FormBuilder,
    private teacherService: TeacherService,
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize the form with validation rules
    this.teacherForm = this.fb.group({
      teacherid: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2)]],
      Assignclass: ['', Validators.required],
      mobileNo: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      Role: ['', Validators.required],
      Notice: [''], // Optional
      Email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      attendance: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      photo: [null, Validators.required],
      classteacher: ['', Validators.required],
      experience: [0, [Validators.required, Validators.min(0)]], // Must be 0 or greater
    });
  }

  ngOnInit(): void {
    // Check authentication status
    this.checkAuthentication();
    //this.loadTeachers(); // directly call for testing
   
    if (this.userAuthenticated) {
      //this.loadTeachers();
    }
    
      this.teacherService.getTeachers().subscribe(
        (res: any) => {
          console.log('API Response:', res);  // check this logs the data
          this.teachers = res;  // ensure this is assigned
        },
        (err) => {
          console.error('Error fetching teachers:', err);
        }
      );
    
  }

  ngOnDestroy(): void {
    this.authenticatedSub.unsubscribe(); // Avoid memory leaks
  }

  /** --- Check User Authentication --- */
  private checkAuthentication(): void {
    this.userAuthenticated = this.authService.getIsAuthenticated();
    this.authenticatedSub = this.authService.getAuthenticatedSub().subscribe((status) => {
      this.userAuthenticated = status;

      // Redirect to login if user is not authenticated
      if (!this.userAuthenticated) {
        alert('You are not logged in! Redirecting to login page...');
        this.router.navigate(['header']);
      }
    });
  }

  /** --- Load All Teachers --- */
  loadTeachers(): void {
    this.teacherService.getTeachers().subscribe({
      next: (data) => {
        this.teachers = data;
        console.log('Teachers loaded successfully:', this.teachers);
      },
      error: (error) => {
        this.errorMessage = error.message;
        console.error('Error loading teachers:', error);
      },
    });
  }

  /** --- Submit the Form --- */
  onSubmit(): void {
    if (this.teacherForm.invalid) {
      alert('Validation failed! Please check the form and try again.');
      this.teacherForm.markAllAsTouched(); // Highlight all invalid fields
      return;
    }

    const teacherData: Teacher = this.teacherForm.value;

    if (this.isEdit && this.currentTeacherId) {
      // Edit teacher
      this.teacherService.editTeacher(this.currentTeacherId, teacherData).subscribe({
        next: () => {
          console.log('Teacher updated successfully');
          this.loadTeachers();
          this.resetForm();
        },
        error: (error) => {
          console.error('Error updating teacher:', error);
          this.errorMessage = error.message;
        },
      });
    } else {
      // Add new teacher
      this.teacherService.addTeacher(teacherData).subscribe({
        next: () => {
          console.log('Teacher added successfully');
          this.loadTeachers();
          this.resetForm();
        },
        error: (error) => {
          console.error('Error adding teacher:', error);
          this.errorMessage = error.message;
        },
      });
    }
  }

  /** --- Fetch All Teachers --- */
  getAllTeachers(): void {
    this.teacherService.getTeachers().subscribe({
      next: (data) => {
        this.teachers = data;
        console.log('Teachers fetched successfully:', this.teachers);
      },
      error: (error) => {
        this.errorMessage = error.message;
        console.error('Error fetching teachers:', error);
      },
    });
  }

  /** --- Edit a Teacher --- */
  editTeacher(teacher: Teacher): void {
    this.isEdit = true;
    this.currentTeacherId = teacher.teacherid; // Use teacherid as identifier
    this.teacherForm.patchValue(teacher); // Pre-fill the form with existing teacher data
  }

  /** --- Delete a Teacher --- */
  deleteTeacher(teacher: Teacher): void {
    if (!teacher.teacherid) {
      console.error('Teacher ID is missing');
      return;
    }

    if (confirm('Are you sure you want to delete this teacher?')) {
      this.teacherService.deleteTeacher(teacher.teacherid).subscribe({
        next: () => {
          console.log('Teacher deleted successfully');
          this.loadTeachers(); // Refresh the list
        },
        error: (error) => {
          console.error('Error deleting teacher:', error);
          this.errorMessage = error.message;
        },
      });
    }
  }

  /** --- Reset the Form --- */
  resetForm(): void {
    this.teacherForm.reset();
    this.isEdit = false;
    this.currentTeacherId = null;
  }

  /** --- Handle Photo Upload --- */
  onPhotoUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const maxSizeInMB = 0.5; // Maximum file size (MB)
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file) {
      if (file.size > maxSizeInBytes) {
        alert(`File size exceeds ${maxSizeInMB} MB. Please upload a smaller file.`);
        this.teacherForm.get('photo')?.setErrors({ maxSizeExceeded: true }); // Set a custom error
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.teacherForm.patchValue({ photo: reader.result });
        this.teacherForm.get('photo')?.markAsTouched(); // Mark as touched for validation
      };
      reader.readAsDataURL(file);
    }
  }
}