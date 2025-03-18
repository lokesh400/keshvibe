const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const methodOverride = require('method-override');
router.use(methodOverride('_method'));

// const Car = require("../models/car");
// const Query = require("../models/Query")

// const multer = require('multer');
// const path = require('path');
// const cloudinary = require('cloudinary').v2;
// const fs = require('fs');
// const { error } = require("console");

// cloudinary.config({
//     cloud_name:process.env.cloud_name, 
//     api_key:process.env.api_key, 
//     api_secret:process.env.api_secret
// });

// // Multer disk storage configuration
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     // Save files to 'uploads/' folder
//     cb(null, 'uploads/');
//   },
//   filename: function (req, file, cb) {
//     // Use the original file name
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });

// // Initialize multer with diskStorage
// const upload = multer({ storage: storage });

// // Function to upload files to Cloudinary
// const Upload = {
//   uploadFile: async (filePath) => {
//     try {
//       // Upload the file to Cloudinary
//       const result = await cloudinary.uploader.upload(filePath, {
//         resource_type: "auto", // Auto-detect file type (image, video, etc.)
//       });
//       return result;
//     } catch (error) {
//       throw new Error('Upload failed: ' + error.message);
//     }
//   }
// };

// router.get('/admin/add-car', (req, res) => {
//     res.render('add-car');
//   });
  
//   // Handle adding a new car
// router.post('/admin/add-car', upload.single("file"), async (req, res) => {
//     try {
//       const { name, brand, year, pricePerDay } = req.body;
//       const result = await Upload.uploadFile(req.file.path);  // Use the path for Cloudinary upload
//       const imageUrl = result.secure_url;
//       fs.unlink(req.file.path, (err) => {
//         if (err) {
//           console.error('Error deleting local file:', err);
//         } else {
//           console.log('Local file deleted successfully');
//         }
//       });
//       const newCar = new Car({ name, brand, year,pricePerDay,photo:imageUrl });
//       await newCar.save();
//       req.flash('succes_msg',"New Car Added Successfully !");
//       res.redirect('/all/cars')
//     } catch (error) {
//       console.log(error);
//       res.status(500).json({ message: 'Upload failed: ' + error.message });
//     }
//   });
 
 
//  // Edit car details
//  router.get('/admin/edit-car/:id', async (req, res) => {
//    try {
//      const car = await Car.findById(req.params.id);
//      res.render('edit-car', { car });
//    } catch (err) {
//      console.log(err);
//      res.status(500).send('Server Error');
//    }
//  });
 
//  // Handle updating car details
//  router.put('/admin/update-car/:id', async (req, res) => {
//    const { name, brand, year, pricePerDay } = req.body;
//    try {
//      await Car.findByIdAndUpdate(req.params.id, { name, brand, year, pricePerDay });
//      req.flash('succes_msg',"Car Updated Successfully !");
//      res.redirect('/all/cars');
//    } catch (err) {
//      console.log(err);
//      res.status(500).send('Server Error');
//    }
//  });
 
//  // Delete car
//  router.delete('/admin/delete-car/:id', async (req, res) => {
//    try {
//      await Car.findByIdAndDelete(req.params.id);
//      req.flash('succes_msg',"Car Deleted Successfully !");
//      res.redirect('/all/cars');
//    } catch (err) {
//      console.log(err);
//      res.status(500).send('Server Error');
//    }
//  });
 
//  //All Queries 
//  router.get("/show/all/queries", async (req,res)=>{
//   const QUery = await Query.find({});
//     res.render("./allQuery.ejs",{queries:Query});
// })

// //Add Gallery Get Route
// router.get('/add/gallery/:id', async(req,res) => {
//   const {id} = req.params;
//   res.render('addGallery.ejs',{id});
// })

// //Show specific car gallery
// router.get('/car/gallery/:id', async(req,res) => {
//   const {id} = req.params;
//   const car = await Car.findById(id);
//   res.render('showGallery.ejs',{car});
// })

// //Add more photos of car
// router.put('/admin/gallery/update/:id',upload.single("file"), async (req, res) => {
//   try {
//       const { id } = req.params;
//       console.log(id)
//       const result = await Upload.uploadFile(req.file.path);  // Use the path for Cloudinary upload
//       const imageUrl = result.secure_url;
//       const updatedCar = await Car.findByIdAndUpdate(
//           id,
//           { $push: { gallery: imageUrl } }, // Push image to gallery array
//           { new: true, runValidators: true } // Return updated document
//       );
//       if (!updatedCar) {
//           return res.status(404).json({ message: 'Car not found' });
//       }
//       req.flash('succes_msg',"Car Updated Successfully !");
//       res.redirect(`/car/gallery/${id}`);
//   } catch (error) {
//       console.log(error)
//       res.status(500).json({ error: error.message });
//   }
// });

 
  module.exports = router;