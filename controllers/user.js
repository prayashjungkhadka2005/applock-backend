const TempUser = require('../models/TempUser'); // Import the TempUser model
const User = require('../models/Users');
const Otp = require('../models/OTP');
const nodemailer = require('nodemailer');
const UserRecoveryEmail = require('../models/UserRecoveryEmail');
const SecurityQuestion = require('../models/SecurityQuestion');
const Authentication = require('../models/Authentication');
const bcrypt = require('bcrypt');
const saltRounds = 10;
require('dotenv').config();

const getUser = (req, res) => {
    User.findAll({ raw: true })
        .then(users => {
            console.log(users);
            res.json(users);
        })
        .catch(err => {
            console.error('Error fetching users:', err);
            res.status(500).json({ error: 'An error occurred while fetching users' });
        });
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        console.log('Received email:', email);

        const user = await TempUser.findOne({ where: { email } });
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000);
        const otpExpire = new Date();
        otpExpire.setMinutes(otpExpire.getMinutes() + 1);

        const [updatedRows] = await Otp.update(
            { otp_code: otpCode, created_at: otpExpire },
            { where: { user_id: user.user_id, otp_type: 'signup' } }
        );

        if (updatedRows === 0) {
            await Otp.create({
                user_id: user.user_id,
                otp_code: otpCode,
                otp_type: 'signup',
                created_at: otpExpire
            });
        }

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to BBL Security!',
            text: `Your OTP for signup (expires in 1 minute): ${otpCode}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ message: 'Failed to send OTP email.' });
            } else {
                console.log('Email sent:', info.response);
                return res.status(201).json({ message: 'OTP sent successfully.' });
            }
        });
    } catch (error) {
        console.error('Error resending OTP:', error);
        return res.status(500).json({ message: 'An error occurred while resending the OTP' });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp, email } = req.body;

        console.log('Received email:', email);
        console.log('Received OTP:', otp);

        const user = await TempUser.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otpRecord = await Otp.findOne({
            where: {
                user_id: user.user_id,
                otp_code: otp,
                otp_type: 'signup'
            }
        });

        if (!otpRecord) {
            return res.status(404).json({ message: 'Wrong OTP' });
        }

        return res.status(200).json({ message: 'OTP Validated' });
    } catch (error) {
        console.error('Error in verifyOtp:', error);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

const recoveryMail = async (req, res) => {
    try {
        const { useremail, recoveryemail, qns1, qns2, ans1, ans2 } = req.body;

        console.log('Received recovery email:', recoveryemail);

        const user = await TempUser.findOne({ where: { email: useremail } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const existingRecoveryEmailUser = await User.findOne({ where: { email: recoveryemail } });
        if (existingRecoveryEmailUser) {
            return res.status(400).json({ message: 'Email already exists in the database. Please use a different email.' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000);

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const existingOtp = await Otp.findOne({
            where: {
                user_id: user.user_id,
                otp_type: 'recovery'
            }
        });

        if (existingOtp) {
            existingOtp.otp_code = otpCode;
            existingOtp.created_at = new Date();
            await existingOtp.save();
        } else {
            await Otp.create({
                user_id: user.user_id,
                otp_code: otpCode,
                otp_type: 'recovery',
                created_at: new Date()
            });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recoveryemail,
            subject: 'OTP for Recovery Email - BBL Security',
            text: `Your OTP for recovery email confirmation: ${otpCode}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ message: 'Failed to send OTP email.' });
            } else {
                console.log('Email sent:', info.response);
                return res.status(201).json({ message: 'OTP sent successfully.', otp: otpCode });
            }
        });

    } catch (error) {
        console.error('Error in recoveryMail:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
};

const setSecurity = async (req, res) => {
    try {
        const { useremail, recoveryemail, qns1, qns2, ans1, ans2, otp } = req.body;

        console.log('Received security questions:', qns1, qns2, otp, ans1, ans2);

        const user = await TempUser.findOne({ where: { email: useremail } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const otpRecord = await Otp.findOne({
            where: {
                user_id: user.user_id,
                otp_code: otp,
                otp_type: 'recovery'
            }
        });

        if (!otpRecord) {
            return res.status(404).json({ message: 'Wrong OTP' });
        }

        await UserRecoveryEmail.create({
            user_id: user.user_id,
            recovery_email: recoveryemail
        });

        await SecurityQuestion.bulkCreate([
            { user_id: user.user_id, question: qns1, answer: ans1 },
            { user_id: user.user_id, question: qns2, answer: ans2 }
        ]);

        return res.status(200).json({ message: 'OTP Validated and security details updated' });
    } catch (error) {
        console.error('Error in setSecurity:', error);
        res.status(500).json({ message: 'Internal server error.' });
    }
};

const resendRecoveryOtp = async (req, res) => {
    try {
        const { recoveryemail, useremail } = req.body;

        const user = await TempUser.findOne({ where: { email: useremail } });

        const otpCode = Math.floor(100000 + Math.random() * 900000);

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const existingOtp = await Otp.findOne({
            where: {
                user_id: user.user_id,
                otp_type: 'recovery'
            }
        });

        if (existingOtp) {
            existingOtp.otp_code = otpCode;
            existingOtp.created_at = new Date();
            await existingOtp.save();
        } else {
            await Otp.create({
                user_id: user.user_id,
                otp_code: otpCode,
                otp_type: 'recovery',
                created_at: new Date()
            });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recoveryemail,
            subject: 'OTP for Recovery Email - BBL Security',
            text: `Your OTP for recovery email confirmation: ${otpCode}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ message: 'Failed to send OTP email.' });
            } else {
                console.log('Email sent:', info.response);
                return res.status(201).json({ message: 'OTP sent successfully.', otp: otpCode });
            }
        });
    } catch (error) {
        console.error('Error in resendOtp:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
};

const handleSignupMethod = async (req, res) => {
    try {
        const { country, email, password } = req.body;

        // Check if the email already exists in the main User table
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered. Please use a different email.' });
        }

        // Check if the email exists in the TempUser table
        const existingTempUser = await TempUser.findOne({ where: { email } });
        if (existingTempUser) {
            // If exists, delete the record from TempUser table
            await existingTempUser.destroy();
            console.log(`Deleted existing TempUser record for email: ${email}`);
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Now proceed with creating a new TempUser
        const newUser = await TempUser.create({
            country,
            email,
            password: hashedPassword,
        });

        const otpCode = Math.floor(100000 + Math.random() * 900000);
        const otpExpire = new Date();
        otpExpire.setMinutes(otpExpire.getMinutes() + 1);

        await Otp.create({
            user_id: newUser.user_id,
            otp_code: otpCode,
            otp_type: 'signup',
            created_at: otpExpire,
        });

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to BBL Security!',
            text: `Your OTP for signup (expires in 1 minute): ${otpCode}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).json({ message: 'Failed to send OTP email.' });
            } else {
                console.log('Email sent:', info.response);
                return res.status(201).json({
                    user_id: newUser.user_id,
                    country: newUser.country,
                    email: newUser.email,
                    created_at: newUser.created_at,
                });
            }
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ message: 'An error occurred while creating the user' });
    }
};

const setPin = async (req, res) => {
    const { pin, useremail } = req.body;

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return res.status(400).json({ message: 'Invalid PIN format. It must be a 4-digit number.' });
    }

    try {
        const user = await TempUser.findOne({ where: { email: useremail } });

        const existingAuth = await Authentication.findOne({
            where: { user_id: user.user_id }
        });

        if (existingAuth) {
            return res.status(400).json({ message: 'User already has an authentication method set' });
        }

        const hashedPin = await bcrypt.hash(pin, 10);

        await Authentication.create({
            user_id: user.user_id,
            auth_type: 'PIN',
            auth_value: hashedPin
        });

        // Move user to main User table
        await User.create({
            country: user.country,
            email: user.email,
            password: user.password,
            disclaimer: user.disclaimer
        });

        await user.destroy(); // Remove from TempUsers table

        res.status(201).json({ message: 'PIN set successfully and user verified' });
    } catch (err) {
        console.error('Error setting PIN:', err);
        res.status(500).json({ message: 'Failed to set PIN', error: err.message });
    }
};

const setPattern = async (req, res) => {
    const { useremail, pattern } = req.body;

    try {
        const userExists = await TempUser.findOne({ where: { email: useremail } });

        if (userExists) {
            const existingAuth = await Authentication.findOne({ where: { user_id: userExists.user_id } });

            if (existingAuth) {
                return res.status(400).json({ message: 'User already has an authentication method set.' });
            }
        }

        const user = userExists;

        const hashedPattern = await bcrypt.hash(pattern, 10);

        await Authentication.create({
            user_id: user.user_id,
            auth_type: 'PATTERN',
            auth_value: hashedPattern
        });

        // Move user to main User table
        await User.create({
            country: user.country,
            email: user.email,
            password: user.password,
            disclaimer: user.disclaimer
        });

        await user.destroy(); // Remove from TempUsers table

        return res.status(201).json({
            user_id: user.user_id,
            message: 'Pattern set successfully and user verified!'
        });
       
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: 'Validation error.', details: error.errors });
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Unique constraint error.', details: error.errors });
        } else {
            console.error('Error setting pattern:', error);
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    }
};



const setBiometric = async (req, res) => {
    const { useremail, authType, biometricToken } = req.body;
    console.log('Request Body:', req.body); // Debugging log

    try {
        const userExists = await TempUser.findOne({ where: { email: useremail } });

        if (userExists) {
            const existingAuth = await Authentication.findOne({ where: { user_id: userExists.user_id } });

            if (existingAuth) {
                console.log('User already has an authentication method set.'); // Debugging log
                return res.status(400).json({ message: 'User already has an authentication method set.' });
            }
        }

        const user = userExists;

        const hashedToken = await bcrypt.hash(biometricToken, 10);
        console.log('Hashed Token:', hashedToken); // Debugging log

        await Authentication.create({
            user_id: user.user_id,
            auth_type: authType,
            auth_value: hashedToken
        });

        // Move user to main User table
        await User.create({
            country: user.country,
            email: user.email,
            password: user.password,
            disclaimer: user.disclaimer
        });

        await user.destroy(); // Remove from TempUsers table

        console.log('Authentication Created:', { user_id: user.user_id, authType }); // Debugging log

        return res.status(201).json({
            user_id: user.user_id,
            message: 'Biometric set successfully and user verified!'
        });

    } catch (error) {
        console.error('Error setting biometric:', error); // Detailed error logging

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: 'Validation error.', details: error.errors });
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Unique constraint error.', details: error.errors });
        } else {
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    }
};

const setDisclaimer = async (req, res) => {
    const { email, call } = req.body;

    console.log(email);
    console.log(call);

    try {
        const user = await TempUser.findOne({ where: { email: email } });
      
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.disclaimer = 'yes';
        await user.save();

        res.status(201).send('Disclaimer updated');
    } catch (err) {
        console.error('Error updating disclaimer:', err);
        res.status(500).json({ message: 'Failed to update disclaimer', error: err.message });
    }
};


module.exports = {
    getUser,
    handleSignupMethod,
    verifyOtp,
    resendOtp,
    recoveryMail,
    setSecurity,
    resendRecoveryOtp,
    setPin,
    setPattern,
    setBiometric,
    setDisclaimer
};
