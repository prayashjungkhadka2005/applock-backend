const express = require('express');
const User = require('../models/Users');
const db = require('../config/database');
const {handleSignupMethod, getUser, verifyOtp, resendOtp, recoveryMail, setSecurity, resendRecoveryOtp, setPattern, setPin, setDisclaimer} = require('../controllers/user');
const { verify } = require('jsonwebtoken');
const SecurityQuestion = require('../models/SecurityQuestion');

const router = express.Router();

router.post('/signup', handleSignupMethod);

router.post('/verifyotp', verifyOtp)

router.get('/', getUser);

router.post('/resendOtp', resendOtp)

router.post('/setsecurity', setSecurity);

router.post('/recoveryMail', recoveryMail);

router.post('/resendRecoveryOtp', resendRecoveryOtp);

router.post('/setpin', setPin);

router.post('/disclaimer', setDisclaimer)

router.post('/setpattern', setPattern);

module.exports = router;