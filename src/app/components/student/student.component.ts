import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { StudentService } from '../../services/student.service';
import { CommonModule } from '@angular/common'; // Required for structural directives like *ngIf and *ngFor
import { FormsModule } from '@angular/forms'; //

@Component({
  selector: 'app-student',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student.component.html',
  styleUrls: ['./student.component.css']
})
export class StudentComponent implements OnInit {
  students: any[] = [];
  currentStudent: any = {};
  isEditing: boolean = false;
  searchQuery: string = '';
  searchBy: string = 'class';

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.getStudents();
  }

  getStudents(): void {
    this.studentService.getStudents().subscribe(
      (data) => this.students = data,
      (error) => console.error('Error fetching students:', error)
    );
  }

  saveStudent(form: NgForm): void {
    if (!form.valid) {
      alert('Please fill in all required fields.');
      return;
    }

    if (this.isEditing) {
      this.studentService.updateStudent(this.currentStudent.studentId, this.currentStudent).subscribe(
        () => {
          this.getStudents();
          this.resetForm(form);
        },
        (error) => console.error('Error updating student:', error)
      );
    } else {
      this.studentService.addStudent(this.currentStudent).subscribe(
        () => {
          this.getStudents();
          this.resetForm(form);
        },
        (error) => console.error('Error adding student:', error)
      );
    }
  }

  editStudent(student: any): void {
    this.isEditing = true;
    this.currentStudent = { ...student };
  }

  deleteStudent(studentId: number): void {
    this.studentService.deleteStudent(studentId).subscribe(
      () => this.getStudents(),
      (error) => console.error('Error deleting student:', error)
    );
  }

  searchStudents(): void {
    if (this.searchBy === 'class') {
      this.studentService.searchStudentsByClass(this.searchQuery).subscribe(
        (data) => this.students = data,
        (error) => console.error('Error searching students by class:', error)
      );
    } else if (this.searchBy === 'name') {
      this.studentService.searchStudentsByName(this.searchQuery).subscribe(
        (data) => this.students = data,
        (error) => console.error('Error searching students by name:', error)
      );
    }
  }

  resetForm(form: NgForm): void {
    this.isEditing = false;
    this.currentStudent = {};
    form.reset();
  }
}