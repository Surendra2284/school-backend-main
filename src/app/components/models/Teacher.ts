//import { Buffer } from 'buffer';
export interface Teacher {
    teacherid: string; // Ensure unique ID
    name: string;
    Assignclass: string;
    mobileNo: string;
    address: string;
    Role: string;
    Notice?: string; // Optional
    Email: string;
    attendance: number;
    photo: string | ArrayBuffer; // Store photo as base64 or Buffer
    classteacher: string;
    subject :string;
    experience: number;
  }

  