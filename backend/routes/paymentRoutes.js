const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Get available payment methods
router.get('/methods', paymentController.getPaymentMethods);

// Stripe payment routes
router.post('/stripe/create', paymentController.createStripePayment);

// Khalti payment routes
router.post('/khalti/create', paymentController.createKhaltiPayment);
router.post('/khalti/verify', paymentController.verifyKhaltiPayment);

// eSewa payment routes
router.post('/esewa/create', paymentController.createESewaPayment);
router.post('/esewa/verify', paymentController.verifyESewaPayment);

module.exports = router;
