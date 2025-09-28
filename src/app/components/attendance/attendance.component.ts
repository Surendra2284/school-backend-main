import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AttendanceService } from '../../services/attendance.service';

@Component({
  selector: 'app-attendance',
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.css'],
})


export class AttendanceComponent implements OnInit {
  attendanceForm: FormGroup;
  students: any[] = []; // Student data will be populated from the backend
  attendances: any[] = []; // Attendance data from the backend
  message = '';

  constructor(private fb: FormBuilder, private attendanceService: AttendanceService) {
    this.attendanceForm = this.fb.group({
      _id: [''],
      studentId: [''],
      name: [''],
      className: [''],
      teacher: [''],
      username: [''],
      date: [''],
      status: ['present'], // Default status as 'present'
    });
  }

  ngOnInit(): void {
    this.loadStudents();
    this.loadAttendances();
  }

  // Fetch Students from backend
  loadStudents() {
    this.attendanceService.getStudents().subscribe((data: any[]) => {
      this.students = data;
    });
  }

  // Fetch Attendance Records
  loadAttendances() {
    this.attendanceService.getAttendance().subscribe((data: any[]) => {
      this.attendances = data;
    });
  }

  // Save Attendance
  saveAttendance() {
    const selectedStudents = this.students.filter(student => student.selected).map(student => student.id);
    const formData = this.attendanceForm.value;

    if (!formData.className || !formData.teacher || !formData.date || selectedStudents.length === 0) {
      this.message = 'Please fill all fields and select students.';
      return;
    }

    const attendanceData = {
      studentId: formData.student,
      name: formData.name,
      className: formData.className,
      teacher: formData.teacher,
      students: selectedStudents,
      date: formData.date,
      status: formData.status,
    };

    this.attendanceService.saveAttendance(attendanceData).subscribe({
      next: () => {
        this.message = 'Attendance saved successfully.';
        this.loadAttendances(); // Refresh attendance list
      },
      error: () => {
        this.message = 'Failed to save attendance.';
      },
    });
  }

  // Update Attendance
  updateAttendance(id: string, updatedData: any) {
    this.attendanceService.updateAttendance(id, updatedData).subscribe({
      next: () => {
        this.message = 'Attendance updated successfully.';
        this.loadAttendances(); // Refresh attendance list
      },
      error: () => {
        this.message = 'Failed to update attendance.';
      },
    });
  }

  // Delete Attendance
  deleteAttendance(id: string) {
    this.attendanceService.deleteAttendance(id).subscribe({
      next: () => {
        this.message = 'Attendance deleted successfully.';
        this.loadAttendances(); // Refresh attendance list
      },
      error: () => {
        this.message = 'Failed to delete attendance.';
      },
    });
  }
}