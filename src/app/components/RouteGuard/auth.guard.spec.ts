import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let authGuard: AuthGuard;
  let routerSpy = { navigate: jasmine.createSpy('navigate') };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Router, useValue: routerSpy } // Mock Router
      ]
    });
    authGuard = TestBed.inject(AuthGuard); // Properly initialize the AuthGuard instance
  });

  it('should be created', () => {
    expect(authGuard).toBeTruthy();
  });

  it('should allow access if token exists', () => {
    spyOn(localStorage, 'getItem').and.returnValue('mockToken'); // Mock localStorage token
    expect(authGuard.canActivate()).toBeTrue(); // Expect route access
  });

  it('should deny access and redirect to login if no token exists', () => {
    spyOn(localStorage, 'getItem').and.returnValue(null); // Mock missing token
    expect(authGuard.canActivate()).toBeFalse(); // Expect route access denied
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']); // Expect redirect to login
  });
});