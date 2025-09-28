import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StudentExlDataService {
  private students: any[] = [];

  setStudents(data: any[]): void {
    this.students = data;
  }

  getStudents(): any[] {
    return this.students;
  }
}
