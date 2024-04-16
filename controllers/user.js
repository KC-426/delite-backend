const userSchema = require("../model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const userSignup = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "Please fill all the required fields!" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingUser = await userSchema.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters long" });
    }

    const hashedPwd = await bcrypt.hash(password, 12);

    const otp = Math.floor(100000 + Math.random() * 900000);

    const otpToken = jwt.sign({ email, otp }, "kuldeep_secret_key", { expiresIn: '1h' });

    console.log(otpToken)

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: email,
      subject: 'Verification OTP',
      text: `Your verification OTP is: ${otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Failed to send OTP via email:', error);
        return res.status(500).json({ message: "Failed to send verification OTP" });
      } else {
        console.log('OTP sent via email:', info.response);
        const newUser = new userSchema({
          firstName,
          lastName,
          email,
          password: hashedPwd
        });
        newUser.save();
        return res.status(201).json({newUser,otpToken, message: "Verification OTP sent successfully", success: true});
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const findUser = await userSchema.findOne({ email });

    if (!findUser) {
      return res
        .status(404)
        .json({ message: "User not found. Please sign up!" });
    }

    const isMatchPassword = await bcrypt.compare(password, findUser.password);
    if (!isMatchPassword) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const token = jwt.sign({ email }, "kuldeep_secret_key", {
      expiresIn: "1h",
    });

    res.cookie("token", token, { httpOnly: true, secure: "production" });

    res
      .status(200)
      .json({success: true, message: "User logged in successfully", email, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


const generateOTPToken = (email, otp) => {
  const payload = {
    email: email,
    otp: otp,
  };

  const token = jwt.sign(payload, "kuldeep_secret_key", { expiresIn: '5m' }); 

  return token;
};

const userVerifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await userSchema.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otpToken = generateOTPToken(email, otp);

    const decodedToken = jwt.verify(otpToken, "kuldeep_secret_key");

    if (decodedToken.email !== email || decodedToken.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await user.save();

    return res.status(200).json({ message: "Email verified successfully", success: true });
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Invalid OTP token" });
    }
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.userSignup = userSignup;
exports.userLogin = userLogin;
exports.userVerifyEmail = userVerifyEmail;
