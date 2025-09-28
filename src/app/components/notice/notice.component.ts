import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NoticeService, Notice } from '../../services/notice.service';

@Component({
  selector: 'app-notice',
  templateUrl: './notice.component.html',
  styleUrls: ['./notice.component.css']
})
export class NoticeComponent implements OnInit {
  noticeForm: FormGroup;
  notices: Notice[] = [];
  isEdit = false;
  currentNoticeId: string | null = null;
  lastNoticeid: string | null = null;
  roles = ['Admin', 'Student', 'Teacher', 'Principal'];

  constructor(private fb: FormBuilder, private noticeService: NoticeService) {
    this.noticeForm = this.fb.group({
      Noticeid: [{ value: '', disabled: true }, Validators.required], // readonly input
      name: ['', Validators.required],
      class: ['', Validators.required],
      Role: ['', Validators.required],
      Notice: [''],
      classteacher: ['']
    });
  }

  ngOnInit(): void {
    this.loadNotices();
  }

  loadNotices1(): void {
    this.noticeService.getNotices().subscribe((data: Notice[]) => {
      this.notices = data;

      // Safely calculate next Notice ID from numeric values
      const ids = this.notices
        .map(n => parseInt(n.Noticeid, 10))
        .filter(id => !isNaN(id));
      const maxId = ids.length > 0 ? Math.max(...ids) : 0;
      this.lastNoticeid = (maxId + 1).toString();

      if (!this.isEdit) {
        this.noticeForm.patchValue({ Noticeid: this.lastNoticeid });
      }

      console.log('Next Noticeid:', this.lastNoticeid);
    });
  }
loadNotices(): void {
  this.noticeService.getNotices().subscribe((data: Notice[]) => {
    // Sort notices by Noticeid in descending order (latest first)
    const sorted = data.sort((a, b) => parseInt(b.Noticeid) - parseInt(a.Noticeid));
    this.notices = sorted;

    // Generate next Notice ID
    const ids = sorted.map(n => parseInt(n.Noticeid, 10)).filter(id => !isNaN(id));
    const maxId = ids.length > 0 ? Math.max(...ids) : 0;
    this.lastNoticeid = (maxId + 1).toString();

    if (!this.isEdit) {
      this.noticeForm.patchValue({ Noticeid: this.lastNoticeid });
    }

    console.log('Next Noticeid:', this.lastNoticeid);
  });
}

  onSubmit(): void {
    if (this.noticeForm.invalid) {
      this.noticeForm.markAllAsTouched();
      return;
    }

    const noticeData: Notice = {
      ...this.noticeForm.getRawValue(), // include disabled fields like Noticeid
    };

    if (this.isEdit && this.currentNoticeId) {
      this.noticeService.editNotice(this.currentNoticeId, noticeData).subscribe(() => {
        this.loadNotices();
        this.resetForm();
      });
    } else {
      noticeData.Noticeid = this.lastNoticeid ?? '1';
      this.noticeService.addNotice(noticeData).subscribe(() => {
        this.loadNotices();
        this.resetForm();
      });
    }
  }

  editNotice(notice: Notice): void {
    this.isEdit = true;
    this.currentNoticeId = notice._id ?? null;

    this.noticeForm.patchValue(notice);
    this.noticeForm.get('Noticeid')?.disable(); // ensure Noticeid remains readonly
  }

  deleteNotice(id: string): void {
    this.noticeService.deleteNotice(id).subscribe(() => {
      this.loadNotices();
    });
  }

  resetForm(): void {
    this.noticeForm.reset();
    this.isEdit = false;
    this.currentNoticeId = null;
    this.loadNotices(); // regenerate new Noticeid
  }

  filterNoticesByClassTeacher(classteacher: string): void {
    this.noticeService.getNoticesByClassTeacher(classteacher).subscribe({
      next: (data: Notice[]) => {
        this.notices = data;
      },
      error: (error) => {
        console.error('Error fetching notices by classteacher:', error);
      }
    });
  }

  filterNoticesByRole(role: string): void {
    this.noticeService.getNoticesByRole(role).subscribe({
      next: (data: Notice[]) => {
        this.notices = data;
      },
      error: (error) => {
        console.error('Error fetching notices by role:', error);
      }
    });
  }
}
