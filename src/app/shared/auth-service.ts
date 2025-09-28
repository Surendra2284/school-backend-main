import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Subject, Observable, of, throwError } from "rxjs";
import { AuthModel } from '../shared/auth-model'

import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from '../services/user.service'
import { BehaviorSubject } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {environment} from '../../environments/environment';
const apiEndpoint = `${environment.apiUrl}`;

@Injectable({ providedIn: "root" })
export class AuthService {
    errorMessage: string = '';
    private token: string = '';
    //private authenticatedSub = new Subject<boolean>();
    private isAuthenticated = false;
    private logoutTimer: any;
    apiEndpoint = `${environment.apiUrl}`;
    private loginUrl = `${environment.apiUrl}/login`;
  private logoutUrl = `${environment.apiUrl}/logout`;
  private updateActivityUrl = `${environment.apiUrl}/update-activity`;
  // Timer for automatic logout

    

    //private apiUrl = apiEndpoint+'/login';
    //private loggedInSubject = new BehaviorSubject<boolean>(false);
    private authenticatedSub = new BehaviorSubject<boolean>(false);
    constructor(
      private http: HttpClient,
      private router: Router,
      private userService: UserService
    ) {
      // Optionally, listen to online/offline events:
      window.addEventListener("offline", () => console.error("You are offline!"));
      window.addEventListener("online", () => console.info("You are back online."));
      console.log('apiEndpoint', this.apiEndpoint);
    }
  
    // Helper: Check for network connection (disconnected object scenario)
    private checkConnection(): boolean {
      if (!navigator.onLine) {
        console.error("Network error: No internet connection (disconnected object).");
        return false;
      }
      return true;
    }
  
    private startLogoutTimer(expirationDuration: number): void {
      this.logoutTimer = setTimeout(() => {
        this.logout();
        alert("You have been logged out due to inactivity.");
      }, expirationDuration);
    }
  
    // Update session activity
    updateSessionActivity(): void {
      const username = localStorage.getItem("username");
  
      if (!username) {
        return;
      }
  
      this.http
        .post<{ message: string }>(this.updateActivityUrl, { username })
        .pipe(
          catchError((error) => {
            console.error("Failed to update session activity:", error);
            return throwError(() => new Error("Failed to update session activity."));
          })
        )
        .subscribe({
          next: (res) => {
            console.log("Session activity updated successfully:", res.message);
            // Reset the logout timer on activity update
            clearTimeout(this.logoutTimer);
            this.startLogoutTimer(10 * 60 * 1000); // Reset inactivity timeout to 10 minutes
          },
        });
    }
  
  
    getIsAuthenticated(): boolean {
        return this.isAuthenticated;
    }

    getAuthenticatedSub(): Observable<boolean> {
        return this.authenticatedSub.asObservable();
        
    }

    getToken(): string {
        return this.token;
    }

    clearLocalStorageData(): void {
        localStorage.removeItem('authToken');
        localStorage.removeItem('expiresIn');
        localStorage.removeItem("username");

    }

    signupUser(username: string, password: string, role: string): Observable<any> {
        const authData: AuthModel = { username, password, role };
        return this.addUser(authData).pipe(
            catchError(error => {
                alert(error.message);
                return of(null);
            })
        );
    }

    loginUser(username: string, password: string, role: string): void {
        const authData: AuthModel = { username, password, role };
        this.clearLoginBeforeAuthentication();

        console.log('loginUser data and apiend', authData,apiEndpoint);
        this.http.post<{ token: string, expiresIn: number }>(this.loginUrl, authData)
            .pipe(
                catchError((err: HttpErrorResponse) => {
                    if (err.status === 401 && err.error.message) {
                        this.errorMessage = err.error.message;
                        this.performLocalLogout();
                        this.clearLoginDetails();
                        this.clearLocalStorageData();
                    } else {
                        this.errorMessage = 'An unexpected error occurred. Please try again later.';
                        this.performLocalLogout();
                        this.clearLoginDetails();
                        this.clearLocalStorageData();
                    }
                    return throwError(() => new Error(this.errorMessage));
                })
            )
            .subscribe({
                next: (res) => {
                    this.token = res.token;
                    if (this.token) {
                        this.isAuthenticated = true;
                        this.authenticatedSub.next(true);
                        this.userService.setUserDetails(role, username);
                        localStorage.setItem("username", username);
                        localStorage.setItem("authToken", this.token);
                        switch (role) {
                            case "Admin":
                                this.router.navigate(['/admin']);
                                break;
                            case "Teacher":
                                this.router.navigate(['/teacher']);
                                break;
                            case "Student":
                                this.router.navigate(['/dashboard']);
                                break;
                        }

                        this.logoutTimer = setTimeout(() => this.logout(), res.expiresIn * 1000);
                        const expiresDate = new Date(new Date().getTime() + res.expiresIn * 1000);
                        this.storeLoginDetails(this.token, expiresDate);
                    }
                },
                error: (error) => {
                    alert(error.message);
                }
            });
    }

    
    logout(): void {
      const username = localStorage.getItem("username");
      if (!username) {
        this.performLocalLogout();
        this.clearLoginDetails();
        this.clearLocalStorageData();
        return;
      }
  
      // Call the logout endpoint
      this.http
        .post<{ message: string }>(this.logoutUrl, { username })
        .pipe(
          catchError((error) => {
            console.error("Logout error:", error);
            return throwError(() => new Error("Failed to log out."));
          })
        )
        .subscribe({
          next: (res) => {
            console.log(res.message);
            this.performLocalLogout();
          },
          error: () => {
            this.performLocalLogout();
          },
        });
    }
  
    private performLocalLogout(): void {
      this.token = "";
      this.isAuthenticated = false;
      this.authenticatedSub.next(false);
      this.clearLocalStorageData();
      clearTimeout(this.logoutTimer);
      this.router.navigate(["/login"]); // Redirect to the login page
    }
  
    clearLoginBeforeAuthentication(): void {
      this.token = "";
      this.isAuthenticated = false;
      this.authenticatedSub.next(false);
      this.clearLocalStorageData();
      this.clearLoginDetails();
      clearTimeout(this.logoutTimer);
    }
  
    storeLoginDetails(token: string, expirationDate: Date): void {
        localStorage.setItem('token', token);
        localStorage.setItem('expiresIn', expirationDate.toISOString());
    }

    clearLoginDetails(): void {
        localStorage.removeItem('token');
        localStorage.removeItem('expiresIn');
    }

    getLocalStorageData(): { token: string; expiresIn: Date } | null {
        const token = localStorage.getItem('token');
        const expiresIn = localStorage.getItem('expiresIn');

        if (!token || !expiresIn) {
            return null;
        }
        return {
            token,
            expiresIn: new Date(expiresIn)
        };
    }

    authenticateFromLocalStorage(): void {
        const localStorageData = this.getLocalStorageData();
        
        if (localStorageData) {
            const now = new Date();
            const expirationDate = localStorageData.expiresIn;
            const expiresIn = expirationDate.getTime() - now.getTime();

            if (expiresIn > 0) {
                this.token = localStorageData.token;
                this.isAuthenticated = true;
                this.authenticatedSub.next(true);
                this.logoutTimer = setTimeout(() => this.logout(), expiresIn);
            } else {
                this.isAuthenticated = false;
                this.authenticatedSub.next(false);
                this.clearLocalStorageData();
            }
        }
    }

    // CRUD Operations for Users
    getUsers(): Observable<any> {
        return this.http.get(this.loginUrl);
    }

    getUser(id: string): Observable<any> {
        return this.http.get(`${this.loginUrl}/${id}`);
    }

    addUser(user: any): Observable<any> {
        return this.http.post(`${this.loginUrl}`, user);
    }

    updateUser(id: string, user: any): Observable<any> {
        return this.http.put(`${this.loginUrl}/${id}`, user);
    }

    deleteUser(id: string): Observable<any> {
        return this.http.delete(`${this.loginUrl}/${id}`);
    }
    
}



