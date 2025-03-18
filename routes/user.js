const express = require("express");
const router = express.Router();
const User = require('../models/User');
const passport = require("passport");
const nodemailer = require('nodemailer');
const passportLocalMongoose = require('passport-local-mongoose');
const Otp = require('../models/Otp');
// const Car = require('../models/car');
// const Query = require('../models/Query')

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/user/login');
  }

// Login route
router.get("/login", (req, res) => {
    if(req.user){
        res.redirect('/all/cars')
    }
    req.flash('error_msg', 'Welcome back');
    res.render("./users/login.ejs");
});

router.post("/login", async (req, res, next) => {
    // Passport Authentication manually
    passport.authenticate("local", async (err, user, info) => {
        if (err) {
            console.error("Error during authentication:", err);
            req.flash('error_msg', 'Something went wrong. Please try again.');
            return res.redirect("/user/login"); // Redirect back to login if there was an error
        }
        if (!user) {
            req.flash('error_msg', info.message || 'Invalid credentials. Please check your username and password.');
            return res.redirect("/user/login"); // Invalid login credentials
        }
        // If login is successful, log in the user
        req.login(user, async (err) => {
            if (err) {
                console.error("Login failed:", err);
                req.flash('error_msg', 'Login failed. Please try again.');
                return res.redirect("/user/login");
            }
            // Flash a success message and redirect based on user role
            req.flash('success_msg', 'You have successfully logged in!');
            res.redirect("/all/cars"); // Redirect to admin dashboard
        });
    })(req, res, next);
});

router.get("/admin", async(req,res)=>{
    const cars = await Car.find({});
    res.render("./admin-dashboard.ejs",{cars})
})

// Logout route
router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/"); // Redirect to homepage after logout
    });
});

// Add A Query
router.post("/add/new/query", async (req, res) => {
    console.log("hello")
    const { name, mobile, message } = req.body;

    try {
        // Save the query in the database
        const newQuery = new Query({ name, mobile, message });
        await newQuery.save(); 
        // Setup email transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            secure: false,
            port: 587,
            auth: {
                user: "lokeshbadgujjar401@gmail.com",
                pass: process.env.mailpass // Ensure this is set correctly in environment variables
            }
        });
        // Define email options
        const mailOptions = {
            from: "lokeshbadgujjar401@gmail.com",
            to: "rentalbrothercar@gmail.com",  // Replace with actual recipient email
            subject: 'New Query Recieved',
            html: `
                <h2>New Query Submitted</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Mobile:</strong> ${mobile}</p>
                <p><strong>Message:</strong> ${message}</p>
                <p>
                    <a href="tel:${mobile}" style="
                        display: inline-block;
                        background-color: #28a745;
                        color: white;
                        padding: 10px 20px;
                        text-decoration: none;
                        border-radius: 5px;
                        font-size: 16px;
                    ">📞 Call Now</a>
                </p>
            `
        };
        // Send email
        await transporter.sendMail(mailOptions);
        console.log("Email sent successfully");
        req.flash('success_msg', "Query generated successfully");
        res.redirect('/');
    } catch (error) {
        console.error("Error:", error);
        req.flash('error_msg', "There was an error processing your query.");
        res.redirect('/');
    }
});

module.exports = router;