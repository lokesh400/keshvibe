const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ Reference User model
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, // ✅ Reference Product model
      quantity: { type: Number, required: true, default: 1 },
      price: { type: Number, required: true }
    }
  ],
  deliveryCharges: {type:Number, default:80},
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "packed", "shipped", "delivered","printed"], default: "pending" },
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Order", OrderSchema);
