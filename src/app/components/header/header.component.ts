import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../shared/auth-service'
import { Subscription } from 'rxjs';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit,OnDestroy {
  private authenticatedSub: Subscription = new Subscription();

    userAuthenticated = false;
  constructor(private authService: AuthService) { 

  }

  ngOnDestroy(): void {
    this.authenticatedSub.unsubscribe();  
}
  ngOnInit(): void {
    this.userAuthenticated = this.authService.getIsAuthenticated();
    this.authenticatedSub = this.authService.getAuthenticatedSub().subscribe(status => {
      this.userAuthenticated = status;
      
    }
    )
  }
  logout(){
    this.authService.logout();
    
  }


}

  

