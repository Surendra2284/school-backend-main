// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://192.168.29.188:3000/login';
  private role: string = '';
  private username: string = '';
  constructor(private http: HttpClient) {}

  getUsers(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

  getUser(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  addUser(user: any): Observable<any> {
    return this.http.post(`${this.apiUrl}`, user);
  }

  updateUser(id: string, user: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
  setUserDetails(id: any, name: string): void {
    this.role = id;
    this.username = name;
    console.log('User details set:', this.role, this.username);
  }

  getUserDetails(): { userId: string; username: string } {
    return { userId: this.role, username: this.username };
  }
}
