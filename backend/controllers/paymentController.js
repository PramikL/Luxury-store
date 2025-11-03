// controllers/paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe Payment
exports.createStripePayment = async (req, res) => {
    try {
        const { amount, currency = 'usd' } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: currency,
        });

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error('Stripe payment error:', error);
        res.status(500).json({ error: 'Payment failed' });
    }
};

// Khalti Payment
exports.createKhaltiPayment = async (req, res) => {
    try {
        const { amount, purchase_order_id, purchase_order_name, customer_info } = req.body;

        // Khalti API configuration
        const khaltiConfig = {
            public_key: process.env.KHALTI_PUBLIC_KEY,
            secret_key: process.env.KHALTI_SECRET_KEY,
            api_url: 'https://a.khalti.com/api/v2/epayment/initiate/'
        };

        const payload = {
            public_key: khaltiConfig.public_key,
            amount: Math.round(amount * 100), // Convert to paisa (smallest unit)
            product_identity: purchase_order_id,
            product_name: purchase_order_name,
            customer_info: customer_info,
            callback_url: `${process.env.FRONTEND_URL}/success.html`,
            cancel_url: `${process.env.FRONTEND_URL}/cancel.html`
        };

        const response = await fetch(khaltiConfig.api_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Key ${khaltiConfig.secret_key}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.idx) {
            res.json({
                success: true,
                payment_url: `https://a.khalti.com/api/v2/epayment/initiate/${result.idx}/`,
                idx: result.idx
            });
        } else {
            res.status(400).json({ error: 'Failed to create Khalti payment' });
        }
    } catch (error) {
        console.error('Khalti payment error:', error);
        res.status(500).json({ error: 'Khalti payment failed' });
    }
};

// Verify Khalti Payment
exports.verifyKhaltiPayment = async (req, res) => {
    try {
        const { idx } = req.body;

        const khaltiConfig = {
            secret_key: process.env.KHALTI_SECRET_KEY,
            api_url: 'https://a.khalti.com/api/v2/epayment/lookup/'
        };

        const response = await fetch(`${khaltiConfig.api_url}${idx}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Key ${khaltiConfig.secret_key}`
            }
        });

        const result = await response.json();

        if (result.status === 'Completed') {
            res.json({
                success: true,
                message: 'Payment verified successfully',
                transaction_id: result.idx,
                amount: result.amount
            });
        } else {
            res.status(400).json({ error: 'Payment verification failed' });
        }
    } catch (error) {
        console.error('Khalti verification error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

// eSewa Payment
exports.createESewaPayment = async (req, res) => {
    try {
        const { amount, product_id, product_name, customer_name, customer_email } = req.body;

        // eSewa configuration
        const esewaConfig = {
            merchant_id: process.env.ESEWA_MERCHANT_ID,
            api_url: 'https://esewa.com.np/epay/main',
            success_url: `${process.env.FRONTEND_URL}/success.html`,
            failure_url: `${process.env.FRONTEND_URL}/cancel.html`
        };

        // Generate unique transaction ID
        const transaction_id = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const payload = {
            amt: amount,
            pdc: 0,
            psc: 0,
            txAmt: 0,
            tAmt: amount,
            pid: transaction_id,
            scd: esewaConfig.merchant_id,
            su: esewaConfig.success_url,
            fu: esewaConfig.failure_url
        };

        // For eSewa, we return the form data to be submitted via POST
        res.json({
            success: true,
            payment_url: esewaConfig.api_url,
            form_data: payload,
            transaction_id: transaction_id
        });
    } catch (error) {
        console.error('eSewa payment error:', error);
        res.status(500).json({ error: 'eSewa payment failed' });
    }
};

// Verify eSewa Payment
exports.verifyESewaPayment = async (req, res) => {
    try {
        const { oid, amt, refId } = req.body;

        const esewaConfig = {
            merchant_id: process.env.ESEWA_MERCHANT_ID,
            api_url: 'https://esewa.com.np/epay/transrec'
        };

        const verificationData = {
            amt: amt,
            rid: refId,
            pid: oid,
            scd: esewaConfig.merchant_id
        };

        const response = await fetch(esewaConfig.api_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams(verificationData)
        });

        const result = await response.text();

        if (result.includes('Success')) {
            res.json({
                success: true,
                message: 'eSewa payment verified successfully',
                transaction_id: oid,
                reference_id: refId,
                amount: amt
            });
        } else {
            res.status(400).json({ error: 'eSewa payment verification failed' });
        }
    } catch (error) {
        console.error('eSewa verification error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
};

// Get Payment Methods
exports.getPaymentMethods = async (req, res) => {
    try {
        const paymentMethods = [
            {
                id: 'stripe',
                name: 'Credit/Debit Card',
                description: 'Pay with Visa, MasterCard, or other cards',
                icon: '💳',
                enabled: true
            },
            {
                id: 'khalti',
                name: 'Khalti',
                description: 'Pay with Khalti Digital Wallet',
                icon: '🟢',
                enabled: !!process.env.KHALTI_PUBLIC_KEY
            },
            {
                id: 'esewa',
                name: 'eSewa',
                description: 'Pay with eSewa Digital Wallet',
                icon: '🔵',
                enabled: !!process.env.ESEWA_MERCHANT_ID
            }
        ];

        res.json(paymentMethods);
    } catch (error) {
        console.error('Error getting payment methods:', error);
        res.status(500).json({ error: 'Failed to get payment methods' });
    }
};
