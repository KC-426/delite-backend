const express = require('express')
const userController = require('../controllers/user')

const router = express.Router()

router.post('/user/signup', userController.userSignup)
router.post('/user/login', userController.userLogin)
router.post('/verify/email', userController.userVerifyEmail)

module.exports = router
