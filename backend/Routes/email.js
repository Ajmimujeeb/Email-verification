const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const User = require('../model/emailSchema');
const crypto = require('crypto');
require('dotenv').config();

// Configure nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});


// Verify SMTP connection
transporter.verify(function(error, success) {
  if (error) {
    console.log("SMTP connection error:", error);
  } else {
    console.log("SMTP server is ready to send emails");
  }
});

// Route to send OTP
router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  try {
    // Generate OTP and expiration time
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Find user or create a new one
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, otp, otpExpiresAt });
    } else {
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;
    }

    // Save user with new OTP
    await user.save();

    // Send OTP via email
    await transporter.sendMail({
      from: process.env.EMAIL,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It is valid for 5 minutes.`,
    });

    res.status(200).json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

// Route to verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    // Check if OTP is valid and not expired
    if (!user || user.otp !== otp || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
});

module.exports = router;
