
const nodemailer = require('nodemailer');



const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,    // Netlify Environment Variable
        pass: process.env.EMAIL_PASS    // Netlify Environment Variable (Your App Password)
    }
});

// Netlify Function ہ
exports.handler = async (event) => {
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
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
            body: JSON.stringify({ message: 'Invalid JSON in request body' }),
        };
    }

    const { name, company, email, message } = formData;

    // Basic validation
    if (!name || !email || !message) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Please provide name, email, and message.' }),
        };
    }

    try {
        // Email Options for the First Recipient
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

        // Email Options for the Second Recipient
        let mailOptionsSecondary = {
            from: process.env.EMAIL_USER,
            to: 'digitalhym@gmail.com',
            subject: `New Contact Form Submission from ${name}`,
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

        // Send emails to both recipients
        await transporter.sendMail(mailOptionsPrimary);
        await transporter.sendMail(mailOptionsSecondary);

        console.log('Emails sent successfully to both recipients!');
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Emails sent successfully!' }),
        };

    } catch (error) {
        console.error('Error sending email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error sending email.', error: error.message }),
        };
    }
};