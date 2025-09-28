import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
 const PhotoUrl= `${environment.apiUrl}/photos`;
@Component({
  selector: 'app-upload-photo',
  templateUrl: './upload-photo.component.html',
  styleUrls: ['./upload-photo.component.css']
})
export class UploadPhotoComponent implements OnInit {
  newPhotoName: string = '';
  newPhotoFile: File | null = null;
  updatePhotoId: string = '';
  updatePhotoName: string = '';
  updatePhotoFile: File | null = null;
  photos: { _id: string; name: string; image: string }[] = []; // List of photos from MongoDB
  Photoadd: string = '';
  api:string = PhotoUrl; // API endpoint for photos
  successMessage: string = '';
  errorMessage: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadPhotos(); // Fetch photos when the component is initialized
  }

  // Handle file selection for both add and update forms
  onFileSelect(event: Event, type: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (type === 'new') {
      this.newPhotoFile = file;
    } else if (type === 'update') {
      this.updatePhotoFile = file;
    }
  }

  // Add a new photo
  addPhoto(event: Event) {
    event.preventDefault();
    if (!this.newPhotoName || !this.newPhotoFile) {
      this.errorMessage = 'Please provide a photo name and file.';
      return;
    }

    const formData = new FormData();
    formData.append('name', this.newPhotoName);
    formData.append('image', this.newPhotoFile);
    this.Photoadd = `${environment.apiUrl}/photos/add`;
    this.http.post(this.Photoadd, formData).subscribe(
      (response: any) => {
        this.successMessage = response.message;
        this.errorMessage = '';
        this.newPhotoName = '';
        this.newPhotoFile = null;
        this.loadPhotos(); // Reload photos
      },
      (error) => {
        this.successMessage = '';
        this.errorMessage = 'Error adding photo.';
      }
    );
  }

  // Update an existing photo
  updatePhoto(event: Event) {
    event.preventDefault();
    if (!this.updatePhotoId) {
      this.errorMessage = 'Please provide the Photo ID.';
      return;
    }

    const formData = new FormData();
    if (this.updatePhotoName) formData.append('name', this.updatePhotoName);
    if (this.updatePhotoFile) formData.append('image', this.updatePhotoFile);
    this.Photoadd = `${environment.apiUrl}/photos/update/${this.updatePhotoId}`;
    this.http.put(this.Photoadd, formData).subscribe(
      (response: any) => {
        this.successMessage = response.message;
        this.errorMessage = '';
        this.updatePhotoId = '';
        this.updatePhotoName = '';
        this.updatePhotoFile = null;
        this.loadPhotos(); // Reload photos
      },
      (error) => {
        this.successMessage = '';
        this.errorMessage = 'Error updating photo.';
      }
    );
  }

  // Load all photos
  loadPhotos() {
    this.http.get(PhotoUrl).subscribe(
      (response: any) => {
        this.photos = response; // Store the photos in the component's state
      },
      (error) => {
        this.errorMessage = 'Error fetching photos.';
      }
    );
  }

  // Delete a photo by ID
  deletePhoto(photoId: string) {
    this.Photoadd = `${environment.apiUrl}/photos/delete/${photoId}`;
    this.http.delete(this.Photoadd).subscribe(
      (response: any) => {
        this.successMessage = response.message;
        this.errorMessage = '';
        this.loadPhotos(); // Reload photos after deletion
      },
      (error) => {
        this.successMessage = '';
        this.errorMessage = 'Error deleting photo.';
      }
    );
  }
}