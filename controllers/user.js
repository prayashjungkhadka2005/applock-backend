const User = require('../models/Users'); // Removed TempUser
const Otp = require('../models/OTP');
const nodemailer = require('nodemailer');
const UserRecoveryEmail = require('../models/UserRecoveryEmail');
const SecurityQuestion = require('../models/SecurityQuestion');
const Authentication = require('../models/Authentication');
const ResetOTP = require('../models/ResetOTP');
const bcrypt = require('bcrypt');
const saltRounds = 10;
require('dotenv').config();
const { sequelize } = require('../models');

const getUser = async (req, res) => {
    try {
        const users = await User.findAll({ raw: true });
        console.log(users);
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'An error occurred while fetching users' });
    }
};

const resendOtp = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { email } = req.body;
        console.log('Received email:', email);

        const user = await User.findOne({ where: { email }, transaction }); // Replaced TempUser with User
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000);
        const otpExpire = new Date();
        otpExpire.setMinutes(otpExpire.getMinutes() + 1);

        const [updatedRows] = await Otp.update(
            { otp_code: otpCode, created_at: otpExpire },
            { where: { user_id: user.user_id, otp_type: 'signup' }, transaction }
        );

        if (updatedRows === 0) {
            await Otp.create({
                user_id: user.user_id,
                otp_code: otpCode,
                otp_type: 'signup',
                created_at: otpExpire
            }, { transaction });
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

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                await transaction.rollback();
                return res.status(500).json({ message: 'Failed to send OTP email.' });
            } else {
                console.log('Email sent:', info.response);
                await transaction.commit();
                return res.status(201).json({ message: 'OTP sent successfully.' });
            }
        });
    } catch (error) {
        console.error('Error resending OTP:', error);
        await transaction.rollback();
        return res.status(500).json({ message: 'An error occurred while resending the OTP' });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { otp, email } = req.body;

        console.log('Received email:', email);
        console.log('Received OTP:', otp);

        const user = await User.findOne({ where: { email } }); // Replaced TempUser with User
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
    const transaction = await sequelize.transaction();
    try {
        const { useremail, recoveryemail, qns1, qns2, ans1, ans2 } = req.body;

        console.log('Received recovery email:', recoveryemail);

        const user = await User.findOne({ where: { email: useremail }, transaction }); // Replaced TempUser with User
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found' });
        }

        if (useremail === recoveryemail) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Recovery Email must be different' });
        }

        const existingRecoveryEmailUser = await User.findOne({ where: { email: recoveryemail }, transaction });
        if (existingRecoveryEmailUser) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Email is already used.' });
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
            },
            transaction
        });

        if (existingOtp) {
            existingOtp.otp_code = otpCode;
            existingOtp.created_at = new Date();
            await existingOtp.save({ transaction });
        } else {
            await Otp.create({
                user_id: user.user_id,
                otp_code: otpCode,
                otp_type: 'recovery',
                created_at: new Date()
            }, { transaction });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recoveryemail,
            subject: 'OTP for Recovery Email - BBL Security',
            text: `Your OTP for recovery email confirmation: ${otpCode}`
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                await transaction.rollback();
                return res.status(500).json({ message: 'Failed to send OTP email.' });
            } else {
                console.log('Email sent:', info.response);
                await transaction.commit();
                return res.status(201).json({ message: 'OTP sent successfully.', otp: otpCode });
            }
        });
    } catch (error) {
        console.error('Error in recoveryMail:', error);
        await transaction.rollback();
        res.status(500).json({ error: 'An error occurred' });
    }
};

const setSecurity = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { useremail, recoveryemail, qns1, qns2, ans1, ans2, otp } = req.body;

        console.log('Received security questions:', qns1, qns2, otp, ans1, ans2);

        const user = await User.findOne({ where: { email: useremail }, transaction }); // Replaced TempUser with User
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found' });
        }

        const otpRecord = await Otp.findOne({
            where: {
                user_id: user.user_id,
                otp_code: otp,
                otp_type: 'recovery'
            },
            transaction
        });

        if (!otpRecord) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Wrong OTP' });
        }

        await UserRecoveryEmail.create({
            user_id: user.user_id,
            recovery_email: recoveryemail
        }, { transaction });

        await SecurityQuestion.bulkCreate([
            { user_id: user.user_id, question: qns1, answer: ans1 },
            { user_id: user.user_id, question: qns2, answer: ans2 }
        ], { transaction });

        await transaction.commit();

        return res.status(200).json({ message: 'OTP Validated' });
    } catch (error) {
        console.error('Error in setSecurity:', error);
        await transaction.rollback();
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

const verifyResetOtp = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { useremail, otp } = req.body;

        const user = await User.findOne({ where: { email: useremail }, transaction });

        const otpRecord = await Otp.findOne({
            where: {
                user_id: user.user_id,
                otp_code: otp,
                otp_type: 'forgot'
            },
            transaction
        });

        if (!otpRecord) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Wrong OTP' });
        }

        return res.status(200).json({ message: 'Reset OTP Validated' });
    } catch (error) {
        console.error('Error in verifyResetOtp:', error);
        await transaction.rollback();
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

const resentResetOtp = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { useremail } = req.body;

        // Find the user by email
        const user = await User.findOne({ where: { email: useremail }, transaction });

        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate a new OTP and set its expiry time
        const otpCode = Math.floor(100000 + Math.random() * 900000);
        const otpExpire = new Date();
        otpExpire.setMinutes(otpExpire.getMinutes() + 1);

        // Find the existing OTP record
        const existingOtp = await Otp.findOne({
            where: {
                user_id: user.user_id,
                otp_type: 'forgot'
            },
            transaction
        });

        // Update the existing OTP or create a new one if it doesn't exist
        if (existingOtp) {
            existingOtp.otp_code = otpCode;
            existingOtp.created_at = otpExpire;
            await existingOtp.save({ transaction });
        } else {
            await Otp.create({
                user_id: user.user_id,
                otp_code: otpCode,
                otp_type: 'forgot',
                created_at: otpExpire
            }, { transaction });
        }

        // Send the OTP via email
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
            to: useremail,
            subject: 'Reset OTP BBL Security!',
            text: `Your OTP for resetting the password (expires in 1 minute): ${otpCode}`,
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                await transaction.rollback();
                return res.status(500).json({ message: 'Failed to send OTP email.' });
            } else {
                console.log('Email sent:', info.response);
                await transaction.commit();
                return res.status(201).json({
                    message: 'Reset OTP sent successfully'
                });
            }
        });
    } catch (error) {
        console.error('Error in resentResetOtp:', error);
        await transaction.rollback();
        return res.status(500).json({ error: 'An error occurred' });
    }
};

const userForgot = async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000);
        const otpExpire = new Date();
        otpExpire.setMinutes(otpExpire.getMinutes() + 1);

        // Find the existing OTP record
        const existingOtp = await Otp.findOne({
            where: {
                user_id: user.user_id,
                otp_type: 'forgot'
            },
            transaction
        });

        // Update the existing OTP or create a new one if it doesn't exist
        if (existingOtp) {
            existingOtp.otp_code = otpCode;
            existingOtp.created_at = otpExpire;
            await existingOtp.save({ transaction });
        } else {
            await Otp.create({
                user_id: user.user_id,
                otp_code: otpCode,
                otp_type: 'forgot',
                created_at: otpExpire,
            }, { transaction });
        }

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
            subject: 'Reset OTP BBL Security!',
            text: `Your OTP for reset password (expires in 1 minute): ${otpCode}`,
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                await transaction.rollback();
                return res.status(500).json({ message: 'Failed to send OTP email.' });
            } else {
                console.log('Email sent:', info.response);
                await transaction.commit();
                return res.status(201).json({
                    message: 'Reset OTP sent successfully'
                });
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'An error occurred during reset', error: error.message });
    }
};

const resendRecoveryOtp = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { recoveryemail, useremail } = req.body;

        const user = await User.findOne({ where: { email: useremail }, transaction }); // Replaced TempUser with User

        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found' });
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
            },
            transaction
        });

        if (existingOtp) {
            existingOtp.otp_code = otpCode;
            existingOtp.created_at = new Date();
            await existingOtp.save({ transaction });
        } else {
            await Otp.create({
                user_id: user.user_id,
                otp_code: otpCode,
                otp_type: 'recovery',
                created_at: new Date()
            }, { transaction });
        }

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: recoveryemail,
            subject: 'OTP for Recovery Email - BBL Security',
            text: `Your OTP for recovery email confirmation: ${otpCode}`
        };

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                await transaction.rollback();
                return res.status(500).json({ message: 'Failed to send OTP email.' });
            } else {
                console.log('Email sent:', info.response);
                await transaction.commit();
                return res.status(201).json({ message: 'OTP sent successfully.', otp: otpCode });
            }
        });
    } catch (error) {
        console.error('Error in resendRecoveryOtp:', error);
        await transaction.rollback();
        res.status(500).json({ error: 'An error occurred' });
    }
};

const handleSignupMethod = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { country, email, password } = req.body;

        // Check if there's an existing incomplete record
        const existingUser = await User.findOne({ where: { email }, transaction });
        if (existingUser) {
            const isAuthSet = await Authentication.findOne({ where: { user_id: existingUser.user_id }, transaction });

            if (!isAuthSet) {
                await existingUser.destroy({ transaction });
                console.log(`Deleted incomplete user record for email: ${email}`);
            } else {
                // If the record is complete, prevent re-signup
                await transaction.rollback();
                return res.status(400).json({ message: 'Email is already registered' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const newUser = await User.create({
            country,
            email,
            password: hashedPassword,
        }, { transaction });

        const otpCode = Math.floor(100000 + Math.random() * 900000);
        const otpExpire = new Date();
        otpExpire.setMinutes(otpExpire.getMinutes() + 1);

        await Otp.create({
            user_id: newUser.user_id,
            otp_code: otpCode,
            otp_type: 'signup',
            created_at: otpExpire,
        }, { transaction });

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

        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                await transaction.rollback();
                return res.status(500).json({ message: 'Failed to send OTP email.' });
            } else {
                console.log('Email sent:', info.response);
                await transaction.commit();
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
        await transaction.rollback();
        return res.status(500).json({ message: 'An error occurred while creating the user' });
    }
};

const setPin = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { pin, useremail } = req.body;

        if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Invalid PIN format. It must be a 4-digit number.' });
        }

        const user = await User.findOne({ where: { email: useremail }, transaction }); // Replaced TempUser with User

        const existingAuth = await Authentication.findOne({
            where: { user_id: user.user_id },
            transaction
        });

        if (existingAuth) {
            await transaction.rollback();
            return res.status(400).json({ message: 'User already has an authentication method set' });
        }

      

        await Authentication.create({
            user_id: user.user_id,
            auth_type: 'PIN',
            auth_value: pin
        }, { transaction });

        await transaction.commit();

        res.status(201).json({ message: 'PIN set successfully and user verified' });
    } catch (err) {
        console.error('Error setting PIN:', err);
        await transaction.rollback();
        res.status(500).json({ message: 'Failed to set PIN', error: err.message });
    }
};

const setPattern = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { useremail, pattern } = req.body;

        const userExists = await User.findOne({ where: { email: useremail }, transaction }); // Replaced TempUser with User

        if (!userExists) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found.' });
        }

        const existingAuth = await Authentication.findOne({
            where: { user_id: userExists.user_id },
            transaction
        });

        if (existingAuth) {
            await transaction.rollback();
            return res.status(400).json({ message: 'User already has an authentication method set.' });
        }

        const hashedPattern = await bcrypt.hash(pattern, 10);

        await Authentication.create({
            user_id: userExists.user_id,
            auth_type: 'PATTERN',
            auth_value: hashedPattern
        }, { transaction });

        await transaction.commit();

        return res.status(201).json({
            user_id: userExists.user_id,
            message: 'Pattern set successfully and user verified!'
        });

    } catch (error) {
        console.error('Error setting pattern:', error);
        await transaction.rollback();

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: 'Validation error.', details: error.errors });
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Unique constraint error.', details: error.errors });
        } else {
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    }
};

const setBiometric = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { useremail, authType, biometricToken } = req.body;
        console.log('Request Body:', req.body);

        const userExists = await User.findOne({ where: { email: useremail }, transaction }); // Replaced TempUser with User

        if (!userExists) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found.' });
        }

        const existingAuth = await Authentication.findOne({
            where: { user_id: userExists.user_id },
            transaction
        });

        if (existingAuth) {
            await transaction.rollback();
            console.log('User already has an authentication method set.');
            return res.status(400).json({ message: 'User already has an authentication method set.' });
        }

        const hashedToken = await bcrypt.hash(biometricToken, 10);
        console.log('Hashed Token:', hashedToken);

        await Authentication.create({
            user_id: userExists.user_id,
            auth_type: authType,
            auth_value: hashedToken
        }, { transaction });

        await transaction.commit();

        console.log('Authentication Created:', { user_id: userExists.user_id, authType });

        return res.status(201).json({
            user_id: userExists.user_id,
            message: 'Biometric set successfully and user verified!'
        });

    } catch (error) {
        console.error('Error setting biometric:', error);

        await transaction.rollback();

        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ message: 'Validation error.', details: error.errors });
        } else if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Unique constraint error.', details: error.errors });
        } else {
            return res.status(500).json({ message: 'Server error.', error: error.message });
        }
    }
};

const userLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(400).json({ message: 'Email or password incorrect' });
        }

        const auth = await Authentication.findOne({
            where: { user_id: user.user_id },
        });

        if (!auth) {
            return res.status(400).json({ message: 'No authentication method found for this user.' });
        }

        // Assuming you're using bcrypt, you can't "decrypt" but instead, you store the raw pin securely
        const rawPin = auth.auth_value; // You need to handle the raw pin or securely store it before hashing
        console.log(rawPin);

        return res.status(201).json({ message: 'Login successful', user, pin: rawPin });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'An error occurred during login', error: error.message });
    }
};

const newPassword = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email }, transaction });

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (passwordMatch) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Enter different password' });
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        user.password = hashedPassword;
        await user.save({ transaction });

        await transaction.commit();

        return res.status(201).json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Error updating password:', error);
        await transaction.rollback();
        return res.status(500).json({ message: 'An error occurred while updating the password', error: error.message });
    }
};

const setDisclaimer = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { email, call } = req.body;

        console.log(email);
        console.log(call);

        const user = await User.findOne({ where: { email: email }, transaction });
      
        if (!user) {
            await transaction.rollback();
            return res.status(404).json({ message: 'User not found' });
        }

        user.disclaimer = 'yes';
        await user.save({ transaction });

        await transaction.commit();

        return res.status(201).json({ message: 'Disclaimer updated'});
    } catch (err) {
        console.error('Error updating disclaimer:', err);
        await transaction.rollback();
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
    userLogin,
    userForgot,
    verifyResetOtp,
    resentResetOtp,
    newPassword,
    setDisclaimer
};
