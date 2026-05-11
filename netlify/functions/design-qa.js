// const fetch = require('node-fetch');

// exports.handler = async (event) => {
//     const headers = {
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Headers': 'Content-Type',
//         'Access-Control-Allow-Methods': 'POST, OPTIONS'
//     };

//     if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };
//     if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: 'Method Not Allowed' };

//     const { imageBase64, mimeType, prompt } = JSON.parse(event.body);

//     try {
//         const response = await fetch("https://api.anthropic.com/v1/messages", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "x-api-key": process.env.ANTHROPIC_API_KEY,
//                 "anthropic-version": "2023-06-01",
//             },
//             body: JSON.stringify({
//                 model: "claude-3-sonnet-20240229",
//                 max_tokens: 3000,
//                 messages: [{
//                     role: "user",
//                     content: [
//                         { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
//                         { type: "text", text: prompt }
//                     ]
//                 }]
//             })
//         });

//         const data = await response.json();
//         const rawText = data.content[0].text;
//         const cleaned = rawText.replace(/```json|```/g, "").trim();
        
//         return {
//             statusCode: 200,
//             headers,
//             body: JSON.stringify({ result: JSON.parse(cleaned) })
//         };
//     } catch (err) {
//         return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
//     }
// };

/**
 * api/design-qa.js — HYM Global Design QA Proxy
 *
 * This is a Vercel Serverless Function that proxies requests from the
 * React frontend to the Anthropic API. It keeps the API key server-side
 * so it is never exposed in the browser.
 *
 * SETUP:
 * 1. Place this file at: /api/design-qa.js (in your project root)
 * 2. Add your Anthropic API key to Vercel environment variables:
 *    Key:   ANTHROPIC_API_KEY
 *    Value: sk-ant-xxxxxxxxxxxx
 * 3. Deploy — Vercel auto-detects files in /api and makes them endpoints.
 *
 * The frontend calls: POST /api/design-qa
 * This function calls: POST https://api.anthropic.com/v1/messages
 *
 * If you are NOT using Vercel, see the Express alternative at the bottom.
 */

export default async function handler(req, res) {
  // ── CORS headers ─────────────────────────────────────────────────────────
  // Replace * with your actual domain in production for security
  // e.g. "https://hymglobal.co.uk"
  res.setHeader("Access-Control-Allow-Origin", "https://hymglobal.co.uk");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Validate input ────────────────────────────────────────────────────────
  const { imageBase64, mimeType, prompt } = req.body || {};

  if (!imageBase64 || !mimeType || !prompt) {
    return res.status(400).json({ error: "Missing required fields: imageBase64, mimeType, prompt" });
  }

  const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowedMimeTypes.includes(mimeType)) {
    return res.status(400).json({ error: "Unsupported image type. Use PNG, JPG, or WEBP." });
  }

  // ── Check API key ─────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY environment variable is not set.");
    return res.status(500).json({ error: "Server configuration error." });
  }

  // ── Call Anthropic API ────────────────────────────────────────────────────
  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.json().catch(() => ({}));
      console.error("Anthropic API error:", errBody);
      return res.status(anthropicRes.status).json({
        error: errBody.error?.message || "Anthropic API request failed.",
      });
    }

    const anthropicData = await anthropicRes.json();

    // Extract text from response
    const rawText = (anthropicData.content || [])
      .map(block => (block.type === "text" ? block.text : ""))
      .join("");

    // Strip any accidental markdown fences and parse JSON
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("JSON parse error. Raw response:", rawText);
      return res.status(500).json({ error: "Failed to parse AI response. Please try again." });
    }

    return res.status(200).json({ result: parsed });

  } catch (err) {
    console.error("Proxy fetch error:", err);
    return res.status(500).json({ error: "Internal server error. Please try again." });
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// ALTERNATIVE: Express.js / Node server (if not using Vercel)
// ═══════════════════════════════════════════════════════════════════════════
//
// If you're using a traditional Node/Express backend instead of Vercel,
// replace the above export with this:
//
// const express = require("express");
// const cors = require("cors");
// const fetch = require("node-fetch"); // npm install node-fetch@2
//
// const app = express();
// app.use(cors({ origin: "https://your-domain.com" })); // lock to your domain
// app.use(express.json({ limit: "25mb" })); // needed for large base64 images
//
// app.post("/api/design-qa", async (req, res) => {
//   const { imageBase64, mimeType, prompt } = req.body;
//   // ... same logic as above handler ...
// });
//
// app.listen(3001, () => console.log("Proxy running on port 3001"));
