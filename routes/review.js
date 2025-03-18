const express = require("express");
const Review = require("../models/Review");
const Product = require("../models/Product");
const router = express.Router();


//render form
router.get("/add/review/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id)
        res.render('writeReview.ejs',{product,id})
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Add a review to a product
router.post("/reviews/add/:productId", async (req, res) => {
    try {
        const productId = req.params.productId
        const { rating, comment } = req.body;

        if (!productId || !rating) {
            return res.status(400).json({ message: "Product ID and rating are required" });
        }

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Create new review
        const newReview = new Review({
            user: req.user._id, // Assuming user is authenticated
            product: productId,
            rating,
            comment
        });

        await newReview.save();

        res.status(201).json({ message: "Review added successfully", review: newReview });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// router.get("/:productId/reviews", async (req, res) => {
//     try {
//         const { productId } = req.params;
//         res.json(reviews);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error" });
//     }
// });


module.exports = router;
