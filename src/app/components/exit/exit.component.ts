import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-exit',
  templateUrl: './exit.component.html',
  styleUrls: ['./exit.component.css']
})
export class ExitComponent implements OnInit {
  constructor(private http: HttpClient) {
    this.notification = ''; // Initialize notification
  }

  student: {
    studentId: string;
    name: string;
    age: number | null;
    class: string;
    address: string;
    photo: File | null;
  } = {
    studentId: '',
    name: '',
    age: null,
    class: '',
    address: '',
    photo: null
  };

  students: Array<{
    studentId: string;
    name: string;
    age: number;
    class: string;
    address: string;
    photo: string;
  }> = [];

  notification: string;
  photoPreview: string | ArrayBuffer | null = null;

  ngOnInit() {
    this.fetchStudents();
  }

  fetchStudents() {
    this.http.get('http://localhost:3000/api/students')
      .subscribe((data: any) => {
        this.students = data;
      }, error => {
        console.error('Error fetching student data', error);
      });
  }

  onSubmit() {
    // Validate the form manually
    if (this.student.studentId && this.student.name && this.student.age && this.student.class && this.student.address) {
      const formData = new FormData();
      formData.append('studentId', this.student.studentId);
      formData.append('name', this.student.name);
      formData.append('age', this.student.age?.toString() || '');
      formData.append('class', this.student.class);
      formData.append('address', this.student.address);
      if (this.student.photo) {
        formData.append('photo', this.student.photo);
      }

      this.http.post('http://localhost:3000/api/students', formData)
        .subscribe(response => {
          console.log('Student data saved', response);
          this.notification = 'Student data saved successfully!';
          this.fetchStudents(); // Refresh the student list
        }, error => {
          console.error('Error saving student data', error);
          this.notification = 'Error saving student data.';
        });
    } else {
      this.notification = 'Please fill out the form correctly before submitting.';
    }
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.student.photo = file;

      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSave(form: NgForm) {
    if (form.valid) {
      const formData = new FormData();
      formData.append('studentId', this.student.studentId);
      formData.append('name', this.student.name);
      formData.append('age', this.student.age?.toString() || '');
      formData.append('class', this.student.class);
      formData.append('address', this.student.address);
      if (this.student.photo) {
        formData.append('photo', this.student.photo);
      }

      this.http.post('http://localhost:3000/api/students', formData)
        .subscribe(response => {
          console.log('Student data saved', response);
          this.notification = 'Student data saved successfully!';
          this.fetchStudents(); // Refresh the student list
          form.resetForm();
          this.photoPreview = null; // Clear the photo preview
        }, error => {
          console.error('Error saving student data', error);
          this.notification = 'Error saving student data.';
        });
    } else {
      this.notification = 'Please fill out the form correctly before saving.';
    }
  }
}
