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

// GET /api/neutral?q=some+question
// This endpoint fetches news articles and gets the most neutral ones
// Example: /api/neutral?q=stock+market
app.get('/api/neutral', async (req, res) => {
    try {
        const q = req.query.q;

        // Check if the query parameter is provided
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required.' });
        }

        // Fetch news articles related to the query
        const newsUrl = `https://newsapi.org/v2/everything?` +
                    `q=${encodeURIComponent(q)}` +
                    `&pageSize=20&sortBy=publishedAt&language=en&apiKey=${NEWS_KEY}`;
        const newsRes = await fetch(newsUrl);
        const newsJ = await newsRes.json();

    if (!Array.isArray(newsJ.articles) || newsJ.articles.length === 0) {
      return res.status(404).json({ error: 'No articles found.' });
    }

    // Build a numbered list for the prompt
    const listText = newsJ.articles
      .map((a, i) => `Article ${i+1}:\nTitle: ${a.title}\nDesc: ${a.description||''}\nURL: ${a.url}`)
      .join('\n\n');

    // Ask OpenAI to pick & neutralize
    const prompt = `Here are some news articles about "${q}". Each has a title, description, and URL: ${listText}

    1) Rate each article for bias on 0 (neutral) to 1 (very biased).  
    2) Identify the article with the lowest bias score.  
    3) Rewrite that least-biased article's key details in a neutral, emotion-free style.

    Return ONLY valid JSON exactly like:
    {
        "title": string,
        "url":   string,
        "neutral_summary": string
    }
        `;

    const reply = await askOpenAI(prompt);

    // Parse & return
    let output;
    try {
      output = JSON.parse(reply);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to parse AI response.', raw: reply });
    }

    res.json(output);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



