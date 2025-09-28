import { Component, OnInit } from '@angular/core';
import { StudentExlDataService } from '../../services/StudentExlDataService.service';
@Component({
  selector: 'app-card-preview',
  templateUrl: './card-preview.component.html',
  styleUrls: ['./card-preview.component.scss']
})
export class CardPreviewComponent implements OnInit {
  students: any[] = [];

  constructor(private studentService: StudentExlDataService) {}

  ngOnInit(): void {
    this.students = this.studentService.getStudents();
  }
}