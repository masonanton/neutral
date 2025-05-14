// Load variables from .env file
require('dotenv').config();

// Import required modules
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

// Create the express app
const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Load API keys
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const NEWS_KEY = process.env.NEWS_API_KEY;

/**
 * Sends a prompt to Chat API and returns the response
 * @param {string} prompt - user's question or message
 * @returns {Promise<string>} - the response from OpenAI
 */
async function askOpenAI(prompt) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: 'You are an unbiased news editor.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.2
        })
    });

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;

    console.log('OpenAI raw response:', raw);

    if (!raw) throw new Error('No message returned from OpenAI');

    // 🔧 Remove code fences like ```json ... ```
    const clean = raw.replace(/```json|```/g, '').trim();

    return clean;
}

// GET /api/neutral?q=topic
// This endpoint fetches news articles and gets the most neutral ones
// Example: /api/neutral?q=stock+market
app.get('/api/neutral', async (req, res) => {
    try {
        const q = req.query.q;

        // Check if the query parameter is provided
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required.' });
        }

        // Fetch up to 20 news articles related to the query
        const newsUrl = `https://newsapi.org/v2/everything?` +
                    `q=${encodeURIComponent(q)}` +
                    `&pageSize=20&sortBy=publishedAt&language=en&apiKey=${NEWS_KEY}`;
        const newsRes = await fetch(newsUrl);
        const newsJ = await newsRes.json();

    if (!Array.isArray(newsJ.articles) || newsJ.articles.length === 0) {
      return res.status(404).json({ error: 'No articles found.' });
    }

    // Build prompt list for OpenAI
    const listText = newsJ.articles
      .map((a, i) => `Article ${i+1}:
    Title: ${a.title}
    Description: ${a.description || '[no description]'}
    URL: ${a.url}`)
      .join('\n\n');

    const prompt = `
    You are a bias detection model evaluating the following news articles about "${q}".

    For each article, assign a "bias_score" between 0.01 and 0.99.
    DO NOT use 0 or 1.
    DO NOT round to 0.0, 0.1, 0.2, etc.
    USE non-rounded decimal values like 0.13, 0.42, 0.58, etc.
    Every score must have at least **two decimal places**.

    Return ONLY the three articles with the **lowest bias_score**.

    Respond ONLY with valid JSON in this exact format:
    [
    {
        "title": "Example Title",
        "url": "https://example.com",
        "bias_score": 0.13
    },
    ...
    ]

    Here are the articles:
    ${listText}
    `;



    // Ask OpenAI and parse JSON
    const reply = await askOpenAI(prompt);

    let output;
    try {
      output = JSON.parse(reply);
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to parse AI response.',
        raw:   reply
      });
    }

    res.json(output);

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



