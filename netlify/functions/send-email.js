// my-form-backend/netlify/functions/send-email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Define allowed origin for CORS
// IMPORTANT: In production, replace 'https://hymglobal.co.uk' with your actual frontend domain
// For development or if you need to allow multiple domains, you can use '*' (less secure)
// or add conditional logic to check the 'Origin' header from the request.
const ALLOWED_ORIGIN = 'https://hymglobal.co.uk'; // <--- Set your frontend domain here

exports.handler = async (event) => {
    // Add CORS headers to all responses
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN, // <--- Add this header
        'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and preflight OPTIONS requests
        'Access-Control-Allow-Headers': 'Content-Type', // Allow Content-Type header
    };

    // Handle preflight OPTIONS request
    // Browsers send an OPTIONS request before the actual POST request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'CORS preflight successful' }),
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers, // Include headers in error responses too
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    let formData;
    try {
        formData = JSON.parse(event.body);
    } catch (error) {
        console.error('Failed to parse request body:', error);
        return {
            statusCode: 400,
            headers, // Include headers
            body: JSON.stringify({ message: 'Invalid JSON in request body' }),
        };
    }

    const { name, company, email, message } = formData;

    if (!name || !email || !message) {
        return {
            statusCode: 400,
            headers, // Include headers
            body: JSON.stringify({ message: 'Please provide name, email, and message.' }),
        };
    }

    try {
        let mailOptionsPrimary = {
            from: process.env.EMAIL_USER,
            to: 'info@hymglobal.co.uk',
            subject: `New Contact Form Submission from HYM Global Website`,
            html: `
                <p>You have a new contact form submission:</p>
                <ul>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Company:</strong> ${company || 'N/A'}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Message:</strong> ${message}</li>
                </ul>
                <p>Reply-To: ${email}</p>
            `,
            replyTo: email
        };

        let mailOptionsSecondary = {
            from: process.env.EMAIL_USER,
            to: 'digitalhym@gmail.com',
            subject: `New Contact Form Submission from HYM Global Website`,
            html: `
                <p>You have a new contact form submission:</p>
                <ul>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Company:</strong> ${company || 'N/A'}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Message:</strong> ${message}</li>
                </ul>
                <p>Reply-To: ${email}</p>
            `,
            replyTo: email
        };

        await transporter.sendMail(mailOptionsPrimary);
        await transporter.sendMail(mailOptionsSecondary);

        console.log('Emails sent successfully to both recipients!');
        return {
            statusCode: 200,
            headers, // Include headers in success response
            body: JSON.stringify({ message: 'Emails sent successfully!' }),
        };

    } catch (error) {
        console.error('Error sending email:', error);
        return {
            statusCode: 500,
            headers, // Include headers in error response
            body: JSON.stringify({ message: 'Error sending email.', error: error.message }),
        };
    }
};