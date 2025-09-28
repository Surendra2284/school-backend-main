

export interface Attendance {
    Studentid: string; // Ensure unique ID
    name: string;
    date:Date;
    role:string
    attendencedata: string;
    Role: string;
    photo: string | ArrayBuffer; // Store photo as base64 or Buffer
    classteacher: string;
    subject :string;
    experience: number;
  }



