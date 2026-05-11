const fetch = require('node-fetch'); // Agar error aaye tou 'npm install node-fetch' karein backend folder mein

exports.handler = async (event) => {
    // 1. CORS Headers
    const headers = {
        'Access-Control-Allow-Origin': '*', // Ya 'http://localhost:5173' sirf dev ke liye
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // 2. Handle Preflight Request
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: 'CORS check success' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { imageBase64, mimeType, prompt } = body;

        if (!imageBase64 || !mimeType || !prompt) {
            return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing fields' }) };
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return { statusCode: 500, headers, body: JSON.stringify({ error: 'API key not set' }) };
        }

        // 3. Call Anthropic
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20240620", // Latest model use karein
                max_tokens: 3000,
                messages: [{
                    role: "user",
                    content: [
                        { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
                        { type: "text", text: prompt }
                    ]
                }]
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return { statusCode: response.status, headers, body: JSON.stringify({ error: data.error?.message || 'API Fail' }) };
        }

        // Response clean karein
        const rawText = data.content.map(b => b.text).join("");
        const cleaned = rawText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ result: parsed })
        };

    } catch (error) {
        console.error("Backend Error:", error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) 
        };
    }
};