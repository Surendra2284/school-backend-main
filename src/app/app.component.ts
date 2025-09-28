import { Component, OnInit } from '@angular/core';
import { AuthService } from '../app/shared/auth-service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(private authService: AuthService){}

  ngOnInit(): void {
    this.authService.authenticateFromLocalStorage();
    document.addEventListener('click', () => this.authService.updateSessionActivity());
    document.addEventListener('keypress', () => this.authService.updateSessionActivity());
  }
  title = 'Surendra Kushwaha';
}