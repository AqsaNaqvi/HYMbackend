
// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//     }
// });

// const ALLOWED_ORIGIN = 'https://hymglobal.co.uk';

// exports.handler = async (event) => {
//     // 1. Setup CORS Headers
//     const headers = {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
//         'Access-Control-Allow-Methods': 'POST, OPTIONS',
//         'Access-Control-Allow-Headers': 'Content-Type',
//     };

//     // 2. Handle CORS Preflight
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
//             headers,
//             body: JSON.stringify({ message: 'Method Not Allowed' }),
//         };
//     }

//     // 3. Parse Request Body
//     let formData;
//     try {
//         formData = JSON.parse(event.body);
//     } catch (error) {
//         return {
//             statusCode: 400,
//             headers,
//             body: JSON.stringify({ message: 'Invalid JSON' }),
//         };
//     }

//     const { name, company, email, message, captchaToken } = formData;

//     // 4. Basic Input Validation
//     if (!name || !email || !message || !captchaToken) {
//         return {
//             statusCode: 400,
//             headers,
//             body: JSON.stringify({ message: 'Missing required fields or Captcha token.' }),
//         };
//     }

//     try {
//         // 5. VERIFY CAPTCHA WITH GOOGLE
//         // We call the Google API to make sure the token sent by the frontend is valid
//         const secretKey = process.env.RECAPTCHA_SECRET_KEY;
//         const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;

//         // Note: fetch is available globally in Node 18+ on Netlify
//         const captchaResponse = await fetch(verifyUrl, { method: 'POST' });
//         const captchaData = await captchaResponse.json();

//         if (!captchaData.success) {
//             console.error('Captcha verification failed:', captchaData['error-codes']);
//             return {
//                 statusCode: 400,
//                 headers,
//                 body: JSON.stringify({ message: 'Captcha validation failed. Are you a bot?' }),
//             };
//         }

//         // 6. IF CAPTCHA SUCCESSFUL, PREPARE EMAILS
//         const emailContent = `
//             <p>You have a new contact form submission:</p>
//             <ul>
//                 <li><strong>Name:</strong> ${name}</li>
//                 <li><strong>Company:</strong> ${company || 'N/A'}</li>
//                 <li><strong>Email:</strong> ${email}</li>
//                 <li><strong>Message:</strong> ${message}</li>
//             </ul>
//             <p><strong>Security Status:</strong> Google reCAPTCHA Verified ✅</p>
//         `;

//         let mailOptionsPrimary = {
//             from: process.env.EMAIL_USER,
//             to: 'info@hymglobal.co.uk',
//             subject: `New Contact Form Submission - HYM Global`,
//             html: emailContent,
//             replyTo: email
//         };

//         let mailOptionsSecondary = {
//             from: process.env.EMAIL_USER,
//             to: 'digitalhym@gmail.com',
//             subject: `New Contact Form Submission - HYM Global`,
//             html: emailContent,
//             replyTo: email
//         };

//         // 7. SEND EMAILS
//         await transporter.sendMail(mailOptionsPrimary);
//         await transporter.sendMail(mailOptionsSecondary);

//         console.log('Captcha Verified & Emails sent successfully!');
        
//         return {
//             statusCode: 200,
//             headers,
//             body: JSON.stringify({ message: 'Message sent successfully!' }),
//         };

//     } catch (error) {
//         console.error('Error:', error);
//         return {
//             statusCode: 500,
//             headers,
//             body: JSON.stringify({ message: 'Internal server error.', error: error.message }),
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

// Security: Malicious content ko saaf karne ke liye function
const sanitizeInput = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\//g, '&#x2F;');
};

exports.handler = async (event) => {
    // 1. Dynamic CORS Setup (Localhost aur Production dono ke liye)
    const allowedOrigins = [
        'https://hymglobal.co.uk',
        'http://localhost:5173',
        'http://localhost:3000'
    ];
    const origin = event.headers.origin;
    const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 2. Handle CORS Preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS success' }) };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    // 3. Parse and Validate Request Body
    let formData;
    try {
        formData = JSON.parse(event.body);
    } catch (error) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid JSON' }) };
    }

    const { name, company, email, message, captchaToken } = formData;

    if (!name || !email || !message || !captchaToken) {
        return { 
            statusCode: 400, 
            headers, 
            body: JSON.stringify({ message: 'All fields and Captcha are required.' }) 
        };
    }

    // Email format validation
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
        return { statusCode: 400, headers, body: JSON.stringify({ message: 'Invalid email format.' }) };
    }

    try {
        // 4. VERIFY CAPTCHA WITH GOOGLE
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;

        const captchaResponse = await fetch(verifyUrl, { method: 'POST' });
        const captchaData = await captchaResponse.json();

        if (!captchaData.success) {
            return { 
                statusCode: 400, 
                headers, 
                body: JSON.stringify({ message: 'Captcha validation failed.' }) 
            };
        }

        // 5. SANITIZE DATA (Security against XSS/Malicious Scripts)
        const safeName = sanitizeInput(name);
        const safeCompany = sanitizeInput(company || 'N/A');
        const safeEmail = sanitizeInput(email); // For display
        const safeMessage = sanitizeInput(message);

        // 6. PREPARE EMAIL CONTENT
        const emailHtml = `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                <h2 style="color: #333;">New Website Inquiry</h2>
                <p><strong>Name:</strong> ${safeName}</p>
                <p><strong>Company:</strong> ${safeCompany}</p>
                <p><strong>Email:</strong> ${safeEmail}</p>
                <p><strong>Message:</strong></p>
                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                    ${safeMessage}
                </div>
                <hr />
                <p style="font-size: 12px; color: #888;">
                    Security Status: Verified by Google reCAPTCHA v2 <br />
                    Origin: ${origin}
                </p>
            </div>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'info@hymglobal.co.uk',
            cc: 'digitalhym@gmail.com', // Dono ko ek sath bhej sakte hain
            subject: `Contact Form: ${safeName} from HYM Global`,
            html: emailHtml,
            replyTo: email // Seedha user ko reply karne ke liye
        };

        // 7. SEND EMAIL
        await transporter.sendMail(mailOptions);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Message sent successfully!' }),
        };

    } catch (error) {
        console.error('Final Backend Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ message: 'Internal server error.', error: error.message }),
        };
    }
};