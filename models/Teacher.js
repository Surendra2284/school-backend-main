
const express = require('express');

const mongoose = require('mongoose'); // Import Mongoose

// Define Student Schema
const teacherSchema = new mongoose.Schema({
  teacherid: { type: String, required: true }, // Unique Student ID
  name: { type: String, required: true },
  Assignclass: { type: String, required: true },
  mobileNo: { type: String, required: true, match: /^[6-9]\d{9}$/ }, // Valid mobile number
  address: { type: String, required: true },
  Role: { type: String, required: true },
  Notice: { type: String },
  Email: { type: String , required: true },
  attendance: { type: Number, required: true, min: 0, max: 100 }, // Attendance percentage
  photo: { type: Buffer, required: true } ,
  classteacher : { type:String,required :true},
  subject : { type:String,required :true},
  experience:{type:Number,required :true}

//
  //  Store photo as binary data
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields
const teacher = mongoose.model('teacherdata', teacherSchema);
module.exports = teacher;