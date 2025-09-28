import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TeacherComponent } from './components/teacher/teacher.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import {LoginComponent } from './components/login/login.component';
import { AdminComponent } from './components/admin/admin.component';
import {ExitComponent } from './components/exit/exit.component';
import { SignUpComponent } from './components/sign-up/sign-up.component';
import { HeaderComponent } from './components/header/header.component';
import { StudentDetailsComponent } from './components/students/student-details/student-details.component';
import { ExcelUploadComponent } from './components/Idcardprinting/components/excel-upload/excel-upload.component';
import { StuDashboardComponent } from './components/stu-dashboard/stu-dashboard.component';
import { UploadPhotoComponent } from './components/upload-photo/upload-photo.component';
import { NoticeComponent } from './components/notice/notice.component';
import { AttendanceComponent } from './components/attendance/attendance.component'; 
import{StudentComponent} from './components/student/student.component';
const routes: Routes = [
  
 { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
 
  { path: 'login', component: LoginComponent },
  { path: 'admin', component: AdminComponent },
  { path: 'teacher', component: TeacherComponent },
 // { path: 'exit', component: ExitComponent },
  { path: 'exit', component:  ExcelUploadComponent },
  { path: 'studentdetail', component: StudentDetailsComponent },
  { path: 'signup', component: SignUpComponent },
  {path: 'studentdashboard', component: StuDashboardComponent},
  { path: 'header', component: HeaderComponent },
  { path: 'upload-photo', component: UploadPhotoComponent },
  { path: 'notice', component: NoticeComponent },
  { path:'Attendance', component:AttendanceComponent},
  {path:'Student',component:StudentComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
