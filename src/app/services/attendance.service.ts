import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
 const AUrl= `${environment.apiUrl}`;
/** --- Attendance Interface --- */
export interface Attendance {
  _id?: string;
  studentId: string;
  name: string;
  className: string;
  teacher: string; // Teacher's name
  username?: string; 
  date: string;
  status: 'Present' | 'Absent' | 'Late';
}
console.log
@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private readonly BASE_URL = AUrl; // Base URL for the API

  constructor(private http: HttpClient) {}

  /** --- Get all students --- */
  getStudents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/students`).pipe(
      catchError(this.handleError('fetch students'))
    );
  }

  /** --- Get all attendance records --- */
  getAttendance(): Observable<Attendance[]> {
    return this.http.get<Attendance[]>(`${this.BASE_URL}/attendence`).pipe(
      catchError(this.handleError('fetch attendance records'))
    );
  }

  /** --- Save attendance --- */
  saveAttendance(data: Attendance): Observable<Attendance> {
    return this.http.post<Attendance>(`${this.BASE_URL}/attendence`, data).pipe(
      catchError(this.handleError('save attendance'))
    );
  }

  /** --- Update attendance --- */
  updateAttendance(id: string, data: Attendance): Observable<Attendance> {
    return this.http.put<Attendance>(`${this.BASE_URL}/attendence/${id}`, data).pipe(
      catchError(this.handleError('update attendance'))
    );
  }

  /** --- Delete attendance --- */
  deleteAttendance(id: string): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/attendence/${id}`).pipe(
      catchError(this.handleError('delete attendance'))
    );
  }

  /** --- Search attendance --- */
  searchAttendance(criteria: { className?: string; name?: string; username?: string }): Observable<Attendance[]> {
    const params = new HttpParams({ fromObject: criteria });
    return this.http.get<Attendance[]>(`${this.BASE_URL}/attendence/search`, { params }).pipe(
      catchError(this.handleError('search attendance'))
    );
  }

  /** --- Centralized error handler --- */
  private handleError(operation: string) {
    return (error: any) => {
      console.error(`Error during ${operation}:`, error);
      return throwError(() => new Error(`Failed to ${operation}.`));
    };
  }
}
