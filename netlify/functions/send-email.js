// // my-form-backend/netlify/functions/send-email.js
// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//     }
// });

// // Define allowed origin for CORS
// // IMPORTANT: In production, replace 'https://hymglobal.co.uk' with your actual frontend domain
// // For development or if you need to allow multiple domains, you can use '*' (less secure)
// // or add conditional logic to check the 'Origin' header from the request.
// const ALLOWED_ORIGIN = 'https://hymglobal.co.uk'; // <--- Set your frontend domain here

// exports.handler = async (event) => {
//     // Add CORS headers to all responses
//     const headers = {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': ALLOWED_ORIGIN, // <--- Add this header
//         'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and preflight OPTIONS requests
//         'Access-Control-Allow-Headers': 'Content-Type', // Allow Content-Type header
//     };

//     // Handle preflight OPTIONS request
//     // Browsers send an OPTIONS request before the actual POST request for CORS
//     if (event.httpMethod === 'OPTIONS') {
//         return {
//             statusCode: 200,
//             headers,
//             body: JSON.stringify({ message: 'CORS preflight successful' }),
//         };
//     }

//     if (event.httpMethod !== 'POST') {
//         return {
//             statusCode: 405,
//             headers, // Include headers in error responses too
//             body: JSON.stringify({ message: 'Method Not Allowed' }),
//         };
//     }

//     let formData;
//     try {
//         formData = JSON.parse(event.body);
//     } catch (error) {
//         console.error('Failed to parse request body:', error);
//         return {
//             statusCode: 400,
//             headers, // Include headers
//             body: JSON.stringify({ message: 'Invalid JSON in request body' }),
//         };
//     }

//     const { name, company, email, message } = formData;

//     if (!name || !email || !message) {
//         return {
//             statusCode: 400,
//             headers, // Include headers
//             body: JSON.stringify({ message: 'Please provide name, email, and message.' }),
//         };
//     }

//     try {
//         let mailOptionsPrimary = {
//             from: process.env.EMAIL_USER,
//             to: 'info@hymglobal.co.uk',
//             subject: `New Contact Form Submission from HYM Global Website`,
//             html: `
//                 <p>You have a new contact form submission:</p>
//                 <ul>
//                     <li><strong>Name:</strong> ${name}</li>
//                     <li><strong>Company:</strong> ${company || 'N/A'}</li>
//                     <li><strong>Email:</strong> ${email}</li>
//                     <li><strong>Message:</strong> ${message}</li>
//                 </ul>
//                 <p>Reply-To: ${email}</p>
//             `,
//             replyTo: email
//         };

//         let mailOptionsSecondary = {
//             from: process.env.EMAIL_USER,
//             to: 'digitalhym@gmail.com',
//             subject: `New Contact Form Submission from HYM Global Website`,
//             html: `
//                 <p>You have a new contact form submission:</p>
//                 <ul>
//                     <li><strong>Name:</strong> ${name}</li>
//                     <li><strong>Company:</strong> ${company || 'N/A'}</li>
//                     <li><strong>Email:</strong> ${email}</li>
//                     <li><strong>Message:</strong> ${message}</li>
//                 </ul>
//                 <p>Reply-To: ${email}</p>
//             `,
//             replyTo: email
//         };

//         await transporter.sendMail(mailOptionsPrimary);
//         await transporter.sendMail(mailOptionsSecondary);

//         console.log('Emails sent successfully to both recipients!');
//         return {
//             statusCode: 200,
//             headers, // Include headers in success response
//             body: JSON.stringify({ message: 'Emails sent successfully!' }),
//         };

//     } catch (error) {
//         console.error('Error sending email:', error);
//         return {
//             statusCode: 500,
//             headers, // Include headers in error response
//             body: JSON.stringify({ message: 'Error sending email.', error: error.message }),
//         };
//     }
// };

// my-form-backend/netlify/functions/send-email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const ALLOWED_ORIGIN = 'https://hymglobal.co.uk';

exports.handler = async (event) => {
    // 1. Setup CORS Headers
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 2. Handle CORS Preflight
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
            headers,
            body: JSON.stringify({ message: 'Method Not Allowed' }),
        };
    }

    // 3. Parse Request Body
    let formData;
    try {
        formData = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Invalid JSON' }),
        };
    }

    const { name, company, email, message, captchaToken } = formData;

    // 4. Basic Input Validation
    if (!name || !email || !message || !captchaToken) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: 'Missing required fields or Captcha token.' }),
        };
    }

    try {
        // 5. VERIFY CAPTCHA WITH GOOGLE
        // We call the Google API to make sure the token sent by the frontend is valid
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;

        // Note: fetch is available globally in Node 18+ on Netlify
        const captchaResponse = await fetch(verifyUrl, { method: 'POST' });
        const captchaData = await captchaResponse.json();

        if (!captchaData.success) {
            console.error('Captcha verification failed:', captchaData['error-codes']);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: 'Captcha validation failed. Are you a bot?' }),
            };
        }

        // 6. IF CAPTCHA SUCCESSFUL, PREPARE EMAILS
        const emailContent = `
            <p>You have a new contact form submission:</p>
            <ul>
                <li><strong>Name:</strong> ${name}</li>
                <li><strong>Company:</strong> ${company || 'N/A'}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Message:</strong> ${message}</li>
            </ul>
            <p><strong>Security Status:</strong> Google reCAPTCHA Verified ✅</p>
        `;

        let mailOptionsPrimary = {
            from: process.env.EMAIL_USER,
            to: 'info@hymglobal.co.uk',
            subject: `New Contact Form Submission - HYM Global`,
            html: emailContent,
            replyTo: email
        };

        let mailOptionsSecondary = {
            from: process.env.EMAIL_USER,
            to: 'digitalhym@gmail.com',
            subject: `New Contact Form Submission - HYM Global`,
            html: emailContent,
            replyTo: email
        };

        // 7. SEND EMAILS
        await transporter.sendMail(mailOptionsPrimary);
        await transporter.sendMail(mailOptionsSecondary);

        console.log('Captcha Verified & Emails sent successfully!');
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Message sent successfully!' }),
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error.', error: error.message }),
        };
    }
};