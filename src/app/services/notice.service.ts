import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
 const noticeUrl= `${environment.apiUrl}/notices`;
export interface Notice {
  _id?: string;
  Noticeid: string; 
  name: string;
  class: string;
  Role: string;
  Notice: string;
  classteacher?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NoticeService {
  private readonly BASE_URL = noticeUrl; // Base URL for the API

  constructor(private http: HttpClient) {}

  getNotices(): Observable<Notice[]> {
    return this.http.get<Notice[]>(this.BASE_URL);
    
  }

  addNotice(notice: Notice): Observable<Notice> {
    return this.http.post<Notice>(this.BASE_URL, notice);
  }

  editNotice(id: string, notice: Notice): Observable<Notice> {
    return this.http.put<Notice>(`${this.BASE_URL}/${id}`, notice);
  }

  deleteNotice(id: string): Observable<void> {
    return this.http.delete<void>(`${this.BASE_URL}/${id}`);
  }

  getNoticesByClassTeacher(classTeacher: string): Observable<Notice[]> {
    return this.http.get<Notice[]>(`${this.BASE_URL}/classteacher/${classTeacher}`);
  }

  getNoticesByRole(role: string): Observable<Notice[]> {
    return this.http.get<Notice[]>(`${this.BASE_URL}/role/${role}`);
  }
}
