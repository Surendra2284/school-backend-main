import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

import { Teacher } from '../components/models/Teacher';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
 const teacherUrl= `${environment.apiUrl}/teachers`;
@Injectable({
  providedIn: 'root',
})
export class TeacherService {
  private readonly BASE_URL = teacherUrl; // Base URL for the API

  constructor(private http: HttpClient) {}

  /** --- Get All Teachers --- */
  getTeachers(): Observable<Teacher[]> {
    return this.http.get<any[]>(this.BASE_URL).pipe(
      // Map _id to teacherid if needed
      map((data) =>
        data.map((teacher) => ({
          ...teacher,
          teacherid: teacher.teacherid || teacher._id,
        }))
      ),
      catchError(this.handleError('fetch teachers'))
    );
  }
  

  /** --- Add a New Teacher --- */
  addTeacher(teacher: Teacher): Observable<void> {
    return this.http.post<void>(this.BASE_URL, teacher).pipe(
      catchError(this.handleError('add teacher'))
    );
  }

  /** --- Edit an Existing Teacher --- */
  editTeacher(id: string, teacher: Teacher): Observable<void> {
    return this.http.put<void>(`${this.BASE_URL}/${id}`, teacher).pipe(
      catchError(this.handleError('edit teacher'))
    );
  }

  /** --- Delete a Teacher --- */
  deleteTeacher(id: string): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`).pipe(
      catchError(this.handleError('delete teacher'))
    );
  }

  /** --- Error Handler --- */
  private handleError(operation: string) {
    return (error: any) => {
      console.error(`Error during ${operation}:`, error);
      return throwError(() => new Error(`Failed to ${operation}.`));
    };
  }
}
