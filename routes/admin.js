const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const router = express.Router();
const {
  isLoggedIn,
  saveRedirectUrl,
  isAdmin,
  ensureAuthenticated,
} = require("../middlewares/login.js");

const multer = require("multer");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const { error } = require("console");

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

// Multer disk storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Save files to 'uploads/' folder
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Use the original file name
    cb(null, Date.now() + path.extname(file.originalname));
  },
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
      throw new Error("Upload failed: " + error.message);
    }
  },
};


router.get("/admin", async (req, res) => {
  const orders = await Order.find()
    .populate("user", "name email")
    .populate("products.product")
    .sort({ createdAt: -1 });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const todayOrders = await Order.find({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfDay, $lte: endOfDay }, // Filter today's orders
        paymentStatus: "paid", // Only include paid orders
      },
    },
    {
      $group: {
        _id: null, // No grouping by specific field
        totalSales: { $sum: "$totalAmount" }, // Sum the totalAmount field
      },
    },
  ]);
  const todaySales = result.length > 0 ? result[0].totalSales : 0;
  const result2 = await Order.aggregate([
    {
      $match: { paymentStatus: "paid" }, // Only include paid orders
    },
    {
      $group: {
        _id: null, // No grouping by specific field
        totalSales: { $sum: "$totalAmount" }, // Sum the totalAmount field
      },
    },
  ]);
  const totalSales = result2.length > 0 ? result2[0].totalSales : 0;
  const pendingOrders = await Order.find({ status: "pending" });
  res.render("admin/adminIndex.ejs", {
    todayOrders,
    todaySales,
    totalSales,
    totalOrders: orders.length,
    pending: pendingOrders.length,
  });
});

// ✅ Render Admin Orders Page
router.get("/admin/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("products.product")
      .sort({ createdAt: -1 });
    res.render("admin/admin-orders", { orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.render("admin-orders", { orders: [] });
  }
});

router.post("/admin/orders/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    await Order.findByIdAndUpdate(orderId, { status });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.json({ success: false });
  }
});

router.get("/order/details/:orderId", isLoggedIn, isAdmin, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId)
      .populate("user")
      .populate("products.product"); // Fetch order details

    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("admin/order-details", { order }); // Render EJS file with order details
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/admin/print/orders/mark-printed", async (req, res) => {
  try {
    const { orderIds } = req.body; // Get the order IDs from the request body
    if (!orderIds || orderIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No order IDs provided." });
    }

    // Update the status of the orders to 'printed' (or any desired status)
    await Order.updateMany(
      { _id: { $in: orderIds } }, // Match orders with these IDs
      { $set: { status: "printed" } } // Update their status
    );

    res.json({ success: true, message: "Orders marked as printed." });
  } catch (error) {
    console.error("Error updating orders:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update orders." });
  }
});

router.get("/admin/orders/count", async (req, res) => {
  try {
    const pending = await Order.countDocuments({ status: "pending" });
    const packed = await Order.countDocuments({ status: "packed" });
    const shipped = await Order.countDocuments({ status: "shipped" });
    const delivered = await Order.countDocuments({ status: "delivered" });

    res.json({ pending, packed, shipped, delivered });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/order-details/:orderId", async (req, res) => {
  try {
    const { status } = req.body;
    await Order.findByIdAndUpdate(req.params.orderId, { status });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, message: "Error updating order status." });
  }
});

//admin to show all costumers
router.get("/admin/all/costumers", async (req, res) => {
  try {
    const costumers = await User.find({ role: "costumer" });
    res.render("admin/allCostumers.ejs", { customers: costumers });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//all pending orders
router.get("/admin/all/pending/orders", async (req, res) => {
  try {
    const orders = await Order.find({ status: "pending" });
    res.render("admin/pendingOrders.ejs", { orders });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//today's orders
//all pending orders
router.get("/admin/all/todays/orders", async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });
    res.render("admin/todayOrders.ejs", { orders });
  } catch (error) {
    console.error("Error fetching order counts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//admin product
// Edit a product
router.post("/admin/edit/:id", async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, {
    name: req.body.name,
    price: req.body.price,
    category: req.body.category,
  });
  res.redirect("/product/management");
});

// Delete a product
router.post("/admin/delete/:id", async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.redirect("/product/management");
});

// Route to display product form
router.get("/add/new/product", (req, res) => {
  res.render("admin/addProduct.ejs"); // Renders views/index.ejs
});

router.post("/add-product", upload.single("file"), async (req, res) => {
  try {
    const { name, price, stock, description, category, sizes } = req.body;
    const sizesArray = sizes ? sizes.split(",").map((size) => size.trim()) : [];
    const result = await Upload.uploadFile(req.file.path); // Use the path for Cloudinary upload
    const imageUrl = result.secure_url;
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error("Error deleting local file:", err);
      } else {
        console.log("Local file deleted successfully");
      }
    });
    const newCar = new Product({
      name,
      price,
      stock,
      description,
      category,
      sizes: sizesArray,
      coverPhoto: imageUrl,
    });
    await newCar.save();
    req.flash("succes_msg", "New Product Added Successfully !");
    res.redirect("/admin");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Upload failed: " + error.message });
  }
});

//specific order
router.get("/admin/view/this/product:id", async (req, res) => {
  
  res.render("admin/addProduct.ejs"); // Renders views/index.ejs
});

module.exports = router;
