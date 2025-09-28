import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TeacherComponent } from './components/teacher/teacher.component';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { HeroDetailComponent } from './hero-detail/hero-detail.component';
import { HeroesComponent } from './heroes/heroes.component';
import { MessagesComponent } from './messages/messages.component';
import { LoginComponent } from './components/login/login.component';
import { AppRoutingModule } from './app-routing.module';
import { AdminComponent } from './components/admin/admin.component';
import { ExitComponent } from './components/exit/exit.component';
import { HttpClientModule } from '@angular/common/http';
import { StudentDetailsComponent } from './components/students/student-details/student-details.component';
import { SignUpComponent } from './components/sign-up/sign-up.component';
import { HeaderComponent } from './components/header/header.component';
import { StuDashboardComponent } from './components/stu-dashboard/stu-dashboard.component';
import { ExcelUploadComponent } from './components/Idcardprinting/components/excel-upload/excel-upload.component';
import { UploadPhotoComponent } from './components/upload-photo/upload-photo.component';
import { NoticeComponent } from './components/notice/notice.component';
import { AttendanceComponent } from './components/attendance/attendance.component'; 
import{StudentComponent} from './components/student/student.component';
import { StudentExlDataService } from './services/StudentExlDataService.service';
import { CardPreviewComponent } from './components/card-preview/card-preview.component';


@NgModule({
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    ReactiveFormsModule,
    StuDashboardComponent,
    
    StudentComponent,
  ],
  declarations: [
    AppComponent,
    DashboardComponent,
    ExcelUploadComponent,
    
    HeroDetailComponent,
    LoginComponent,
    ExitComponent,
    StudentDetailsComponent,
    AdminComponent,
    MessagesComponent,
    SignUpComponent,
    HeaderComponent,
    UploadPhotoComponent,
    NoticeComponent,
    AttendanceComponent,
    TeacherComponent,
    CardPreviewComponent
  ],
  providers: [StudentExlDataService],

  bootstrap: [AppComponent]
})
export class AppModule { }
