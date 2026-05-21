const express=require('express');
const router=express.Router();
const XLSX=require('xlsx');
const multer=require('multer');
const Student=require('../models/Student');
const {emitNoticeChanged}=require('../server');

const upload=multer({storage:multer.memoryStorage()});

const validatePayload=(requiredFields,payload)=>{
  for(const field of requiredFields){
    if(!payload[field]||payload[field].toString().trim()==='') return `${field} is required.`;
  }
  return null;
};

const MOBILE_RE=/^[6-9]\d{9}$/;

router.post('/add',async(req,res)=>{
  try{
    console.log('Incoming student payload:',req.body);
    const validationError=validatePayload(['name','class','mobileNo','Email'],req.body);
    if(validationError) return res.status(400).json({message:validationError});
    if(!MOBILE_RE.test(String(req.body.mobileNo))) return res.status(400).json({message:'Invalid mobile number.'});
    const studentData={
      ...req.body,
      name:String(req.body.name||'').trim(),
      class:String(req.body.class||'').trim(),
      mobileNo:String(req.body.mobileNo||'').trim(),
      Email:String(req.body.Email||'').trim()
    };
    const student=new Student(studentData);
    await student.save();
    emitNoticeChanged({type:'student-added',studentId:student.studentId});
    return res.status(201).json({message:'Student created successfully!',student});
  }catch(error){
    console.error('Error adding student:',error);
    return res.status(500).json({error:error.message});
  }
});

router.post('/bulk-notice',upload.single('file'),async(req,res)=>{
  try{
    if(!req.file) return res.status(400).json({error:'Excel file required.'});
    const workbook=XLSX.read(req.file.buffer,{type:'buffer'});
    const sheet=workbook.Sheets[workbook.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(sheet);
    const results={updated:0,notFound:[],nameMismatch:[],errors:[]};

    for(const row of rows){
      const studentId=Number(row.StudentID);
      const excelName=String(row.Name||'').trim();
      const newNotice=row.Notice||'';
      const excelAttendance=row.Attendance;
      const replaceMode=String(row.ReplaceMode||'').toLowerCase()==='yes';

      if(Number.isNaN(studentId)||!excelName){
        results.errors.push({row,error:'Missing StudentID or Name'});
        continue;
      }

      const student=await Student.findOne({studentId});
      if(!student){
        results.notFound.push(studentId);
        continue;
      }

      const dbName=String(student.name||'').trim();
      if(dbName!==excelName){
        results.nameMismatch.push({studentId,excelName,dbName});
        continue;
      }

      if(replaceMode){
        student.Notice=newNotice||'';
        if(!Number.isNaN(Number(excelAttendance))) student.attendance=Number(excelAttendance);
      }else{
        if(newNotice.trim()) student.Notice=student.Notice?`${student.Notice} | ${newNotice}`:newNotice;
        if(excelAttendance!==undefined&&excelAttendance!==null&&excelAttendance!==''){
          const addAttendance=Number(excelAttendance);
          if(!Number.isNaN(addAttendance)) student.attendance=Number(student.attendance||0)+addAttendance;
        }
      }

      await student.save();
      results.updated++;
    }

    emitNoticeChanged({type:'student-bulk-notice-updated',updated:results.updated});
    return res.status(200).json(results);
  }catch(error){
    console.error('Bulk notice update error:',error);
    return res.status(500).json({error:'Server error',details:error.message});
  }
});

router.get('/',async(req,res)=>{
  try{
    const filters={...req.query};
    const limit=Number(req.query.limit)||10;
    const skip=Number(req.query.skip)||0;
    delete filters.limit;
    delete filters.skip;
    const total=await Student.countDocuments(filters);
    const students=await Student.find(filters).limit(limit).skip(skip).sort({createdAt:-1});
    return res.status(200).json({total,limit,skip,students});
  }catch(error){
    console.error('Error fetching students:',error);
    return res.status(500).json({error:error.message});
  }
});

router.get('/classes/list',async(req,res)=>{
  try{
    const classes=await Student.distinct('class');
    return res.status(200).json(classes.sort());
  }catch(error){
    console.error('Error fetching class list:',error);
    return res.status(500).json({error:'Failed to load classes.'});
  }
});

router.get('/:id',async(req,res)=>{
  try{
    const student=await Student.findOne({studentId:req.params.id});
    if(!student) return res.status(404).json({message:'Student not found.'});
    return res.status(200).json(student);
  }catch(error){
    console.error('Error fetching student:',error);
    return res.status(500).json({error:'Server error.'});
  }
});

router.put('/update/:id',async(req,res)=>{
  try{
    if(Object.keys(req.body).length===0) return res.status(400).json({message:'No data provided for update.'});
    const updateData={...req.body};
    if(updateData.name!==undefined) updateData.name=String(updateData.name).trim();
    if(updateData.class!==undefined) updateData.class=String(updateData.class).trim();
    if(updateData.mobileNo!==undefined) updateData.mobileNo=String(updateData.mobileNo).trim();
    if(updateData.Email!==undefined) updateData.Email=String(updateData.Email).trim();

    const student=await Student.findOneAndUpdate({studentId:req.params.id},updateData,{new:true,runValidators:true});
    if(!student) return res.status(404).json({message:'Student not found.'});
    emitNoticeChanged({type:'student-updated',studentId:student.studentId});
    return res.status(200).json({message:'Student updated successfully!',student});
  }catch(error){
    console.error('Error updating student:',error);
    return res.status(500).json({error:error.message});
  }
});

router.delete('/delete/:id',async(req,res)=>{
  try{
    const result=await Student.deleteOne({studentId:req.params.id});
    if(result.deletedCount===0) return res.status(404).json({message:'Student not found.'});
    emitNoticeChanged({type:'student-deleted',studentId:req.params.id});
    return res.status(200).json({message:'Student deleted successfully.'});
  }catch(error){
    console.error('Error deleting student:',error);
    return res.status(500).json({message:'Internal Server Error.'});
  }
});

router.get('/class/:class',async(req,res)=>{
  try{
    const className=String(req.params.class||'').trim();
    if(!className) return res.status(400).json({message:'Class name is required.'});
    const students=await Student.find({class:className});
    return res.status(200).json(students);
  }catch(error){
    console.error('Error searching students by class:',error);
    return res.status(500).json({error:error.message});
  }
});

router.get('/name/:name',async(req,res)=>{
  try{
    const name=String(req.params.name||'').trim();
    if(!name) return res.status(400).json({message:'Name is required.'});
    const students=await Student.find({name});
    return res.status(200).json(students);
  }catch(error){
    console.error('Error searching students by name:',error);
    return res.status(500).json({error:error.message});
  }
});

router.post('/bulk',async(req,res)=>{
  try{
    const {students}=req.body||{};
    const upsert=String(req.query.upsert||'false')==='true';
    if(!Array.isArray(students)||students.length===0) return res.status(400).json({message:'students must be a non-empty array.'});

    const clean=[];
    const errors=[];
    const seen=new Set();

    students.forEach((raw,i)=>{
      const row=i+2;
      const s={
        studentId:Number(raw.studentId),
        name:String(raw.name||'').trim(),
        class:String(raw.class||'').trim(),
        mobileNo:String(raw.mobileNo||'').trim(),
        address:raw.address||'',
        Role:raw.Role||'Student',
        Notice:raw.Notice||'',
        Email:String(raw.Email||'').trim(),
        attendance:Number(raw.attendance||0),
        photo:raw.photo||'',
        classteacher:raw.classteacher||''
      };

      if(Number.isNaN(s.studentId)) errors.push({row,error:'Invalid studentId.'});
      if(!s.name) errors.push({row,error:'Name is required.'});
      if(!s.class) errors.push({row,error:'Class is required.'});
      if(!MOBILE_RE.test(s.mobileNo)) errors.push({row,error:'Invalid mobile number.'});
      if(seen.has(s.studentId)) errors.push({row,error:`Duplicate studentId ${s.studentId}`});
      seen.add(s.studentId);
      clean.push(s);
    });

    if(errors.length) return res.status(422).json({message:'Validation errors.',errors});

    let inserted=0;
    let updated=0;

    if(upsert){
      const ops=clean.map(student=>({updateOne:{filter:{studentId:student.studentId},update:{$set:student},upsert:true}}));
      const result=await Student.bulkWrite(ops,{ordered:false});
      inserted=result.upsertedCount||0;
      updated=result.modifiedCount||0;
    }else{
      const docs=await Student.insertMany(clean,{ordered:false});
      inserted=docs.length||0;
    }

    emitNoticeChanged({type:'students-bulk-imported',inserted,updated});
    return res.status(200).json({inserted,updated,total:clean.length});
  }catch(error){
    console.error('Bulk import fatal:',error);
    return res.status(500).json({message:'Bulk import failed.',error:error.message});
  }
});

module.exports=router;