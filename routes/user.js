const express = require("express");
const router = express.Router();
const User = require('../models/User');
const passport = require("passport");
const nodemailer = require('nodemailer');
const passportLocalMongoose = require('passport-local-mongoose');
const Otp = require('../models/Otp');
const NewsLetter = require('../models/NewsLetter.js')
const {isLoggedIn,saveRedirectUrl,isAdmin,ensureAuthenticated} = require('../middlewares/login.js');

// Login route
router.get("/login", (req, res) => {
    if(req.user){
        res.redirect('/all/cars')
    }
    req.flash('error_msg', 'Welcome back');
    res.render("./users/login.ejs");
});

router.post("/login", saveRedirectUrl, (req, res, next) => {
    passport.authenticate("local", async (err, user, info) => {
        if (err) {
            console.error("Error during authentication:", err);
            req.flash('error_msg', 'Something went wrong. Please try again.');
            return res.redirect("/user/login");
        }
        if (!user) {
            req.flash('error_msg', info.message || 'Invalid credentials.');
            return res.redirect("/user/login");
        }
        req.login(user, (err) => {
            if (err) {
                console.error("Login failed:", err);
                req.flash('error_msg', 'Login failed. Please try again.');
                return res.redirect("/user/login");
            }
            req.flash('success_msg', 'Successfully logged in!');
            res.redirect(res.locals.RedirectUrl);
        });
    })(req, res, next);
});

// router.get("/admin", async(req,res)=>{
//     const cars = await Car.find({});
//     res.render("./admin-dashboard.ejs",{cars})
// })

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
                user: "official.keshvibe@gmail.com",
                pass: process.env.mailpass // Ensure this is set correctly in environment variables
            }
        });
        // Define email options
        const mailOptions = {
            from: "official.keshvibe@gmail.com",
            to: `${email}`,  // Replace with actual recipient email
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

router.get('/details', async(req,res)=>{
    const user = req.user;
    res.render('users/userDetails.ejs',{user})
})

router.post('/subscribe/to/newsletter', async (req, res) => {
    const { email } = req.body;

    // Validate email input
    if (!email || !email.trim()) {
        req.flash("error_msg", "Please provide a valid email address.");
        return res.redirect('/');
    }

    try {
        const already = await NewsLetter.findOne({ email });
        if (already) {
            req.flash("error_msg", 'You are already subscribed to our newsletter.');
            return res.redirect('/');
        }
        const newSubscriber = new NewsLetter({ email });
        await newSubscriber.save();
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            secure: false,
            port: 587,
            auth: {
                user: "official.keshvibe@gmail.com",
                pass: process.env.mailpass // Ensure this is set in your environment variables
            }
        });
        const mailOptions = {
            from: "official.keshvibe@gmail.com",
            to: email, // Pass the email from the request body here
            subject: 'Welcome to KeshVibe Newsletter!',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);">
                        <h1 style="color: #007bff; text-align: center;">Welcome to KeshVibe!</h1>
                        <p style="font-size: 16px; color: #333;">Hi there,</p>
                        <p style="font-size: 16px; color: #333;">Thank you for subscribing to the KeshVibe newsletter! We're excited to have you join our community.</p>
                        <p style="font-size: 16px; color: #333;">Stay tuned for exclusive updates, the latest fashion trends, and special offers just for you.</p>
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="https://keshvibe.in" style="
                                display: inline-block;
                                background-color: #007bff;
                                color: white;
                                padding: 10px 20px;
                                text-decoration: none;
                                border-radius: 5px;
                                font-size: 16px;
                            ">Visit Our Store</a>
                        </div>
                        <p style="font-size: 16px; color: #333;">If you have any questions, feel free to reach out to us anytime at <a href="mailto:official.keshvibe@gmail.com" style="color: #007bff; text-decoration: none;">official.keshvibe@gmail.com</a>.</p>
                        <p style="font-size: 16px; color: #333;">Cheers,<br>The KeshVibe Team</p>
                        <hr style="border: none; border-top: 1px solid #ddd;">
                        <p style="font-size: 12px; color: #999; text-align: center;">You received this email because you subscribed to the KeshVibe newsletter.</p>
                    </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        req.flash("success_msg", 'Successfully subscribed to our newsletter...');
        res.redirect('/');
    } catch (error) {
        console.error("Error during subscription:", error);
        req.flash("error_msg", "There was an error subscribing to the newsletter. Please try again.");
        res.redirect('/');
    }
});


module.exports = router;