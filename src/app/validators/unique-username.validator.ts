import { Injectable } from '@angular/core';
import { AbstractControl, AsyncValidator, ValidationErrors, AsyncValidatorFn } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../auth.service1';

@Injectable({ providedIn: 'root' })
export class UniqueUsernameValidator implements AsyncValidator {
  constructor(private authService: AuthService) {}

  validate(control: AbstractControl): Observable<ValidationErrors | null> {
    return of(null);
  }
}

export function uniqueUsernameValidator(authService: AuthService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return of(null);
  };
}
