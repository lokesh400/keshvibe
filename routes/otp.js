const express = require("express");
const router = express.Router();
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator'); 
require('dotenv').config();

const Otp = require('../models/Otp');


router.post('/new/send-otp', async (req, res) => {
    const { email } = req.body;

    const otp = otpGenerator.generate(6, { 
        digits: true, 
        upperCaseAlphabets: false, 
        lowerCaseAlphabets: false, 
        specialChars: false 
    });
    
    const expirationTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    try {

        const transporter = nodemailer.createTransport({
            service:'gmail',
            host:'smtp.gmail.com',
            secure:false,
            port:587,
            auth:{
             user:"lokeshbadgujjar401@gmail.com",
             pass:process.env.mailpass
            }
           });
        
           try{
              const mailOptions = await transporter.sendMail({
                from:"lokeshbadgujjar401@gmail.com",
                to: `${email}`,
                subject: 'Your OTP Code',
                text: `your otp to create your account is ${otp}`,
            });
           } catch(error){
            transporter.sendMail(mailOptions,(error,info)=>{
                if(error){
                    console.log(error)
                }
                else{
                    console.log(info+response);
                }
            })
        }

        
        let user = await Otp.findOne({ email });
        if (!user) {
            // If user does not exist, create a new entry
            user = new Otp({ email, otp, otpExpiration: expirationTime });
        } else {
            // If the user already exists, just update the OTP and expiration
            user.otp = otp;
            user.otpExpiration = expirationTime;
        }
        await user.save();
        // Send OTP via email (this part is not shown)
        res.json({ message: 'OTP sent to your email.' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ message: 'Error sending OTP.' });
    }
});

// FORGET PASSWORD OTP SEND
router.post('/otp/forget-password', async (req, res) => {
    const { email } = req.body;
 
    const otp = otpGenerator.generate(6, { 
        digits: true, 
        upperCaseAlphabets: false, 
        lowerCaseAlphabets: false, 
        specialChars: false 
    });
    
    const expirationTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    try {

        const transporter = nodemailer.createTransport({
            service:'gmail',
            host:'smtp.gmail.com',
            secure:false,
            port:587,
            auth:{
             user:"lokeshbadgujjar401@gmail.com",
             pass:process.env.mailpass
            }
           });
        
           try{
              const mailOptions = await transporter.sendMail({
                from:"lokeshbadgujjar401@gmail.com",
                to: `${email}`,
                subject: 'Your OTP Code',
                text: ` The otp to reset your password on The Test Pulse is ${otp}`,
            });
           } catch(error){
            transporter.sendMail(mailOptions,(error,info)=>{
                if(error){
                    console.log(error)
                }
                else{
                    console.log(info+response);
                }
            })
        }

        
        let user = await Otp.findOne({ email });
        if (!user) {
            // If user does not exist, create a new entry
            user = new Otp({ email, otp, otpExpiration: expirationTime });
        } else {
            // If the user already exists, just update the OTP and expiration
            user.otp = otp;
            user.otpExpiration = expirationTime;
        }
        await user.save();
        // Send OTP via email (this part is not shown)
        res.json({ message: 'OTP sent to your email.' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ message: 'Error sending OTP.' });
    }
});

module.exports = router;