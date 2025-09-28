import { Component } from '@angular/core';
import * as XLSX from 'xlsx';
// Update the import path to match the actual file location and casing
import { StudentExlDataService } from '../../../../services/StudentExlDataService.service';


@Component({
  selector: 'app-excel-upload',
  templateUrl: './excel-upload.component.html',
  styleUrls: ['./excel-upload.component.css']
})
export class ExcelUploadComponent {

  constructor(private StudentExlDataService: StudentExlDataService) {}

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      console.warn('No file selected');
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const arrayBuffer = (e.target as FileReader).result as ArrayBuffer;
      const data = new Uint8Array(arrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });

      if (!workbook.SheetNames.length) {
        console.error('No sheets found in the Excel file');
        return;
      }

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      // Store the parsed student data in the service
      this.StudentExlDataService.setStudents(jsonData);
      console.log('Excel data uploaded:', jsonData);
    };

    reader.readAsArrayBuffer(file);
  }
}
