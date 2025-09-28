import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Subject, Observable, of, throwError } from "rxjs";
import { AuthModel } from "./app/services/auth-model";
import { switchMap, catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { UserService } from "./app/services/user.service";

@Injectable({ providedIn: "root" })
export class AuthService {
    errorMessage: string = '';
    private token: string = '';
    private authenticatedSub = new Subject<boolean>();
    private isAuthenticated = false;
    private logoutTimer: any;
    private apiUrl = 'http://localhost:3000/user';

    constructor(private http: HttpClient, private router: Router, private userService: UserService) {}

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

        this.http.post<{ token: string, expiresIn: number }>('http://localhost:3000/login', authData)
            .pipe(
                catchError((err: HttpErrorResponse) => {
                    if (err.status === 401 && err.error.message) {
                        this.errorMessage = err.error.message;
                    } else {
                        this.errorMessage = 'An unexpected error occurred. Please try again later.';
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
        this.token = '';
        this.isAuthenticated = false;
        this.authenticatedSub.next(false);
        this.router.navigate(['/login']); // Redirect to login after logout
        clearTimeout(this.logoutTimer);
        this.clearLoginDetails();
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
}
