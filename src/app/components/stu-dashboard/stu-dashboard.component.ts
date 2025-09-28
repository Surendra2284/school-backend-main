import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Required for structural directives like *ngIf and *ngFor
import { FormsModule } from '@angular/forms'; // Required for Template-Driven Forms
import { StudentService } from '../../services/student.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-stu-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule], // Include CommonModule and FormsModule for standalone component
  templateUrl: './stu-dashboard.component.html',
  styleUrls: ['./stu-dashboard.component.css']
})
export class StuDashboardComponent implements OnInit {
  students: any[] = []; // List of students fetched by class
  selectedClass: string = ''; // Holds the class for searching students
  isEditing: boolean = false; // Tracks editing mode
  currentStudent: Student = this.resetStudent(); // Stores the student being edited or added
  role1: string = ''; // User role fetched from user service
  username1: string = ''; // Username fetched from user service

  constructor(private studentService: StudentService, private userService: UserService) {}

  ngOnInit(): void {
    // Fetch user details from the service
    const userDetails = this.userService.getUserDetails();
    this.role1 = userDetails.userId; // Assuming userService provides 'roleId'
    this.username1 = userDetails.username;
  }

  // Search students by class
  searchByClass(): void {
    if (!this.selectedClass) {
      alert('Please enter a class name.');
      return;
    }

    
  }

  // Add a new student
  addStudent(form: any): void {
    if (!form.valid) {
      alert('Please fill all required fields.');
      return;
    }

    this.studentService.addStudent(form.value).subscribe(
      (response) => {
        alert('Student added successfully!');
        this.students.push(response.student); // Update local student list
        this.resetForm(form); // Clear the form
      },
      (error) => {
        console.error('Error adding student:', error);
        alert('Failed to add student.');
      }
    );
  }

  // Edit an existing student
  editStudent(student: Student): void {
    this.isEditing = true;
    this.currentStudent = { ...student }; // Clone the student object for editing
  }

  // Update the edited student
  updateStudent(form: any): void {
    if (!form.valid) {
      alert('Please fill all required fields.');
      return;
    }

  }

  // Reset the form
  resetForm(form: any): void {
    this.isEditing = false;
    this.currentStudent = this.resetStudent(); // Reset the current student object
    form.reset(); // Reset the form controls
  }

  // Reset currentStudent object to its default state
  private resetStudent(): Student {
    return {
      studentId: 0,
      name: '',
      class: '',
      mobileNo: '',
      address: '',
      Role: '',
      Notice: '',
      Email: '',
      attendance: 0,
      photo: null,
      classteacher: ''
    };
  }

  logout(): void {
    console.log('User logged out.');
    alert('You have been logged out!');
  }

  performAction(): void {
    console.log('Performing an admin action...');
    // Add custom admin actions here
  }
}

// Define the Student interface for type safety
interface Student {
  studentId: number;
  name: string;
  class: string;
  mobileNo: string;
  address: string;
  Role: string;
  Notice?: string;
  Email: string;
  attendance: number;
  photo: any;
  classteacher?: string;
}