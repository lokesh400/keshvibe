const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Product = require("../models/Product");

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

// // // show all products
// router.get("/all/products", async (req, res) => {
//   res.render('allProducts.ejs')
// });
router.get("/all/products", async (req, res) => {
  try {
    let { sort, category, madeFor } = req.query;
    let filter = {};
    if (category) filter.category = category;
    if (madeFor) filter.madeFor = madeFor;

    let products = await Product.find(filter).sort(
      sort === "price" ? { price: 1 } : sort === "newest" ? { createdAt: -1 } : {}
    );

    const categories = await Product.distinct("category");
    const madeForValues = await Product.distinct("madeFor");

    res.render("allProducts.ejs", { products, categories, madeForValues, sort, category, madeFor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/products", async (req, res) => {
    try {
        let { page = 1, limit = 10, sort = "asc", madeFor, category, sortBy } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);
        let filter = {};
        if (madeFor) filter.madeFor = madeFor; // Filter by gender
        if (category) filter.category = category; // Filter by category (T-shirts, Hoodies, etc.)
        let sortOption = {}; // Sorting logic
        if (sortBy === "price") {
            sortOption.price = sort === "asc" ? 1 : -1;
        } else if (sortBy === "newest") {
            sortOption.createdAt = -1;
        }
        // Fetch products
        let products = await Product.find(filter)
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        // Fetch reviews for popularity sorting
        if (sortBy === "popularity") {
            const productIds = products.map((product) => product._id);
            const reviews = await Review.aggregate([
                { $match: { productId: { $in: productIds } } },
                { $group: { _id: "$productId", avgRating: { $avg: "$rating" } } }
            ]);
            const reviewMap = {};
            reviews.forEach((r) => {
                reviewMap[r._id] = r.avgRating || 0;
            });
            products.forEach((p) => {
                p.avgRating = reviewMap[p._id] || 0;
            });
            products.sort((a, b) => b.avgRating - a.avgRating); // Sort by highest rating
        }
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ message: "Failed to load products" });
    }
});

//to filter categories
router.get('/api/category/products' ,async (req,res)=>{
  try{
    const products = await Product.find()
    res.json(products)
  } catch (error){
    res.send("internal system error")
  }
})


//search products
router.get("/search/products", async (req, res) => {
  try {
    const query = req.query.query; // Get search term from URL
    if (!query || query.trim() === "") {
      return res.redirect("/search-error");
  }
      const products = await Product.find({
        $or: [
            { name: { $regex: query, $options: "i" } },
            { category: { $regex: query, $options: "i" } },
            { keywords: { $elemMatch: { $regex: query, $options: "i" } } }
        ]
    });
      res.render("search", { products }); // Render with products
  } catch (error) {
      res.status(500).json({ message: "Server error", error });
  }
});

//searcherror
router.get("/search-error", (req,res)=>{
  res.render("searchError.ejs");
})

//by madefor
router.get("/madefor/category/products", async (req, res) => {
  try {
    const Query = req.query.query || ""; // Ensure it's at least an empty string
    const query = Query.toLowerCase(); // Convert to lowercase

      let filter = {};
      const products = await Product.find({
        $or: [
            { name: { $regex: query, $options: "i" } },
            { madefor: { $regex: query, $options: "i" } },
        ]
    });
      // Check if category is provided in the query string
      // if (req.query.category) {
      //     filter.category = req.query.category; // Filter products by category
      // }

      // const products = await Product.find(filter); // Fetch products based on filter
      res.render("search", { products });
  } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Server error" });
  }
});

//sho[ by category 
router.get('/madefor/category/products/category/:men', async (req,res)=>{
  const products = await Product.find({madeFor:"Men"});
  res.render("search", { products });
})

router.get('/madefor/category/products/category/:women', async (req,res)=>{
  const products = await Product.find({madeFor:"Women"});
  res.render("search", { products });
})

router.get('/madefor/category/products/category/this/:kids', async (req,res)=>{
  res.render("error/comingSoon.ejs")
})

//all products
router.get("/product/management", async (req, res) => {
  const products = await Product.find();
  res.render("admin/allProducts.ejs", { products });
});

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
    const { name, price, stock, description, category,sizes } = req.body;
    const sizesArray = sizes ? sizes.split(",").map(size => size.trim()) : [];
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

router.get("/getUniqueMadeFor", async (req, res) => {
    try {
        const uniqueMadeFor = await Product.distinct("madeFor");
        res.json(uniqueMadeFor);
    } catch (error) {
        res.status(500).json({ message: "Error fetching 'Made For' values" });
    }
});

//related products 
router.get("/related/:productId", async (req, res) => {
  try {
      const productId = req.params.productId;

      // Find the current product
      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).json({ message: "Product not found" });
      }

      // Fetch related products (same category, excluding current product)
      const relatedProducts = await Product.find({
          category: product.category,
          _id: { $ne: productId },
      }).limit(4); // Limit to 4 related products

      res.json(relatedProducts);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
