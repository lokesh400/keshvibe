const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Cart = require("../models/Cart"); // Your Cart model
const Product = require("../models/Product");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User")

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.rzp_key_id,
    key_secret: process.env.rzp_key_secret
});

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.render('errorLogin.ejs')
  }
  
  function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
      return next();
    }
    res.render("components/error/accessdenied.ejs");
  }

//pre login route
router.get("/my/cart",ensureAuthenticated,(req,res)=> {
    res.redirect(`/cart/${req.user._id}`);
})

router.get('/this/project/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        const reviews = await Review.find({ product: req.params.id })
            .populate("user", "name")
            .sort({ createdAt: -1 });
  
        let relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: req.params.id },
        });
  
        // Fetch reviews for related products and calculate avgRating
        relatedProducts = await Promise.all(relatedProducts.map(async (prod) => {
            const review = await Review.find({ product: prod._id });
            prod = prod.toObject(); // Convert Mongoose document to plain object
            prod.avgRating = review.length > 0 
                ? review.reduce((sum, r) => sum + r.rating, 0) / review.length 
                : 0;
            return prod;
        }));
  
        // Sort related products: highest rating first, then latest
        relatedProducts.sort((a, b) => {
            if (b.avgRating === a.avgRating) {
                return new Date(b.createdAt) - new Date(a.createdAt); // Newest first
            }
            return b.avgRating - a.avgRating; // Highest rating first
        });
  
        // Limit to 4 products
        relatedProducts = relatedProducts.slice(0, 4);
  
        res.render('thisProduct.ejs', {
            product,
            reviews,
            relatedProducts
        });
  
    } catch (err) {
        console.error("Error fetching product: ", err);
        res.status(500).send('Server error');
    }
  });
  

// Add to Cart Route
router.post("/add-to-cart", async (req, res) => {
    try {
        const { userId, productId, quantity, size } = req.body;
        // Validate input data
        if (!userId || !productId || !quantity || !size) {
            return res.status(400).json({ message: "User ID, Product ID, Quantity, and Size are required." });
        }
        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found." });
        }
        // Find user's cart or create a new one
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [] });
        }
        // Check if product with the same size already exists in cart
        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId && item.size === size
        );
        if (itemIndex > -1) {
            // If the same product with the same size exists, update quantity
            cart.items[itemIndex].quantity += parseInt(quantity);
        } else {
            // Otherwise, add a new entry with the selected size
            cart.items.push({ product: productId, price: product.price, quantity: parseInt(quantity), size });
        }
        await cart.save();
        res.status(200).json({ message: "Item added to cart", cart });
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ message: "Failed to add to cart", error });
    }
});


//edit cart
router.post("/update-quantity", async (req, res) => {
    try {
        const { userId, productId, change } = req.body;

        if (!userId || !productId || change === undefined) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex === -1) return res.status(404).json({ message: "Item not found in cart" });

        cart.items[itemIndex].quantity += change;

        if (cart.items[itemIndex].quantity <= 0) {
            cart.items.splice(itemIndex, 1); // Remove item if quantity is 0
        }
        await cart.save();
        return res.json({ success: true });
    } catch (error) {
        console.error("Error updating cart:", error);
        return res.status(500).json({ message: "Server error" });
    }
});

// 🗑 Remove item from cart
router.post("/remove-from-cart", async (req, res) => {
    const { productId, userId } = req.body;
    try {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) return res.status(404).json({ message: "Cart not found" });
        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();
        res.json({ message: "Item removed from cart" });
    } catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});

// 📦 Get Cart Items
router.get("/cart/:userId", async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.params.userId }).populate("items.product");
        if (!cart) {
            return res.render('cart.ejs', { cart: { items: [] }, totalAmount: 0, keyId: process.env.rzp_key_id });
        }
        let totalAmount = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        res.render('cart.ejs', { cart, totalAmount, keyId: process.env.rzp_key_id });
    } catch (error) {
        console.error("Error fetching cart:", error);
        res.status(500).json({ message: "Server error", error });
    }
});



// 🔥 Create Razorpay Order
router.post("/cart/create-order", async (req, res) => {
    const { userId } = req.body;
    try {
        const cart = await Cart.findOne({ user: userId }).populate("items.product");
        if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Cart is empty" });

        const totalAmount = cart.items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

        const options = {
            amount: totalAmount * 100, // Razorpay requires amount in paise
            currency: "INR",
            receipt: `receipt_${Math.random().toString(36).substr(2, 9)}`,
        };

        const order = await razorpay.orders.create(options);
        res.json({ orderId: order.id, amount: totalAmount });

    } catch (error) {
        res.status(500).json({ message: "Error creating order", error });
    }
})

// ✅ Verify Payment & Clear Cart
// router.post("/cart/verify-payment", async (req, res) => {
//     const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;

//     const generatedSignature = crypto.createHmac("sha256", process.env.rzp_key_secret)
//         .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//         .digest("hex");

//     if (generatedSignature !== razorpay_signature) {
//         return res.status(400).json({ message: "Invalid payment signature" });
//     }

//     try {
//         // ✅ Clear the cart after successful payment
//         await Cart.deleteOne({ user:req.user._id});
//         res.json({ message: "Payment successful! Order placed." });

//     } catch (error) {
//         res.status(500).json({ message: "Error clearing cart", error });
//     }
// });

// const cart = await Cart.findOne({user:req.user._id});
//         // console.log(cart)
//         // const newOrder = new Order({
//         //     user: userId,
//         //     products: cart.items.map(item => ({
//         //         product: item.product._id,
//         //         quantity: item.quantity
//         //     })),
//         //     totalAmount: cart.items.reduce((total, item) => total + item.product.price * item.quantity, 0),
//         //     paymentStatus: "paid",
//         //     status: "pending"
//         // });
//         // console.log(newOrder)
//         // await newOrder.save();


router.post("/cart/verify-payment", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !userId) {
            return res.status(400).json({ message: "Missing required payment details" });
        }
        const generatedSignature = crypto
            .createHmac("sha256", process.env.rzp_key_secret)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex");
        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Invalid payment signature" });
        }
        const userObjectId = new mongoose.Types.ObjectId(userId);
        const cart = await Cart.findOne({ user: userObjectId }).populate("items.product");
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: "Cart not found or is empty" });
        }
        const newOrder = new Order({
            user: userObjectId,
            products: cart.items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                price: item.product.price
            })),
            totalAmount: cart.items.reduce((total, item) => total + item.product.price * item.quantity, 0),
            paymentStatus: "paid",
            status: "pending"
        });
        await newOrder.save();
        await Cart.deleteOne({ user: userObjectId });
        console.log("Cart cleared successfully!");
        res.json({ message: "Payment successful! Order placed.", order: newOrder });
    } catch (error) {
        console.error("Error verifying payment:", error);
        res.status(500).json({ message: "Error verifying payment", error });
    }
});

router.get("/my/order-success", (req,res)=>{
    res.render('orderPlaced.ejs');
})


// Route to render the Add Address Page
router.get("/add-address", (req, res) => {
    res.render("add-address", { 
        currUser: req.user,  // Pass the logged-in user
        isEdit: false  // Explicitly set isEdit to false
    });
});

// Handle Address Submission
router.post('/add-address', async (req, res) => {
    const { street, city, state, pincode, mobile } = req.body;
    console.log(req.body);
    try {
        await User.findByIdAndUpdate(req.user._id, {
            address: { street, city, state, pincode },
            mobile
        });
        res.redirect(`/cart/${req.user._id}`);
    } catch (err) {
        console.error(err);
        res.redirect('/add-address');
    }
});

// Route to render the Edit Address Page
router.get("/edit-address", (req, res) => {
    if (!req.user.address) {
        return res.redirect("/add-address");
    }
    res.render("add-address", { 
        currUser: req.user, 
        isEdit: true  // Set isEdit to true for edit mode
    });
});

// Handle Address Update
router.post('/edit-address', async (req, res) => {
    const { street, city, state, pincode, mobile } = req.body;
    try {
        await User.findByIdAndUpdate(req.user._id, {
            address: { street, city, state, pincode },
            mobile
        });
        res.redirect(`/cart/${req.user._id}`);
    } catch (err) {
        console.error(err);
        res.redirect('/edit-address');
    }
});

module.exports = router;
