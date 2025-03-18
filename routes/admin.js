const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const router = express.Router();

// ✅ Render Admin Orders Page
router.get("/admin/orders", async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email")
            .populate("products.product")
            .sort({ createdAt: -1 });

            console.log(orders)
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

router.get("/order-details/:orderId", async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate("user").populate("products.product"); // Fetch order details

        if (!order) {
            return res.status(404).send("Order not found");
        }

        res.render("admin/order-details", { order }); // Render EJS file with order details
    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.post("/admin/orders/mark-printed", async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: "No orders provided." });
        }

        // ✅ Update only orders that are still "pending"
        const result = await Order.updateMany(
            { _id: { $in: orderIds }, status: "pending" },
            { $set: { status: "printed" } }
        );

        res.json({ success: true, message: `Updated ${result.modifiedCount} orders to 'printed'` });
    } catch (error) {
        console.error("Error updating orders:", error);
        res.status(500).json({ success: false, message: "Server error" });
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


module.exports = router;
