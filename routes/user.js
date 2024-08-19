const express = require('express');
const User = require('../models/Users');
const db = require('../config/database');
const { sequelize, handleSignupMethod, getUser, verifyOtp, resendOtp, recoveryMail, setSecurity, resendRecoveryOtp, verifyResetOtp, resentResetOtp , newPassword, setPattern, setPin, setDisclaimer, setBiometric,  userLogin, userForgot} = require('../controllers/user');
const { verify } = require('jsonwebtoken');
const SecurityQuestion = require('../models/SecurityQuestion');

const router = express.Router();

router.post('/signup', handleSignupMethod);

router.post('/forgot', userForgot);

router.post('/resetOtp', verifyResetOtp);

router.post('/resendResetOtp', resentResetOtp);

router.post('/newPassword', newPassword);


router.post('/login', userLogin);

router.post('/verifyotp', verifyOtp);

router.get('/', getUser);

router.post('/resendOtp', resendOtp);

router.post('/setsecurity', setSecurity);

router.post('/recoveryMail', recoveryMail);

router.post('/resendRecoveryOtp', resendRecoveryOtp);

router.post('/setpin', setPin);

router.post('/disclaimer', setDisclaimer);

router.post('/setpattern', setPattern);

router.post('/setbiometric', setBiometric);

module.exports = router;