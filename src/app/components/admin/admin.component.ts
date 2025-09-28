import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})

export class AdminComponent implements OnInit {
  role: string = '';
  username: string = '';
  activeTab: string = 'student'; // Default tab

  // Method to switch tabs
  selectTab(tab: string): void {
    this.activeTab = tab;
  }

  constructor(private userService: UserService) {}
 

  // Define the logout method
  logout(): void {
    console.log('User logged out.');
    // Perform logout logic here (e.g., clear session, navigate to login page, etc.)
    alert('You have been logged out!');
  }

  performAction(): void {
    console.log('Performing an admin action...');
    // Add custom admin actions here
  }
  ngOnInit(): void {
    const userDetails = this.userService.getUserDetails();
    this.role = userDetails.userId;
    this.username = userDetails.username;
  }
}
