const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Order = require("../models/Order");
const Product  = require("../models/Product");
const User = require("../models/User")

const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { error } = require("console");

cloudinary.config({
    cloud_name:process.env.cloud_name, 
    api_key:process.env.api_key, 
    api_secret:process.env.api_secret
});

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save files to 'uploads/' folder
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Use the original file name
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Initialize multer with diskStorage
const upload = multer({ storage: storage });

// Function to upload files to Cloudinary
const Upload = {
  uploadFile: async (filePath) => {
    try {
      // Upload the file to Cloudinary
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: "auto", // Auto-detect file type (image, video, etc.)
      });
      return result;
    } catch (error) {
      throw new Error('Upload failed: ' + error.message);
    }
  }
};

const axios = require("axios");

router.post("/cart/get-delivery-charge", async (req, res) => {
    try {
        const { cartTotal } = req.body;

        // Example Shiprocket API Request for Serviceability
        const response = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/courier/serviceability/",
            {
                pickup_postcode: "110001", // Your warehouse pincode
                delivery_postcode: "400001", // Customer pincode (fetch dynamically)
                cod: 0, // 0 for Prepaid, 1 for COD
                weight: 1 // Approx weight in kg
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer YOUR_SHIPROCKET_API_TOKEN`
                }
            }
        );

        const deliveryCharge = response.data.data.available_courier_companies[0].rate;
        res.json({ deliveryCharge });

    } catch (error) {
        console.error("Error fetching delivery charge:", error);
        res.status(500).json({ error: "Failed to fetch delivery charge" });
    }
});


router.get("/my/orders", async (req, res) => {
    try {
        const userId = req.user._id; // Assuming authentication is implemented

        const orders = await Order.find({ user: userId })
            .populate("products.product") // Populate product details
            .sort({ createdAt: -1 });

            console.log(orders.products)

        res.render("myOrders.ejs", { orders });
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.render("my-orders", { orders: [] });
    }
});

 
  module.exports = router;