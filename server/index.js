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
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 1000,
            temperature: 0.7
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

// GET /api/predict?q=some+question
// This endpoint fetches news articles and predicts outcomes based on them
// Example: /api/predict?q=stock+market
app.get('/api/predict', async (req, res) => {
    try {
        const q = req.query.q;

        // Check if the query parameter is provided
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required.' });
        }

        // Fetch news articles related to the query
        const newsUrl = `https://newsapi.org/v2/everything?` +
                    `q=${encodeURIComponent(q)}` +
                    `&pageSize=20&sortBy=publishedAt&apiKey=${NEWS_KEY}`;
        const newsRes = await fetch(newsUrl);
        const newsJ = await newsRes.json();

        // Format headlines for OpenAI input
        const snippets = (newsJ.articles || [])
            .map(a => `${a.title} — ${a.description || ''}`)
            .join('\n');
        
        // Create prompt for OpenAI
        const prompt = `Given the news snippets below about "${q}",
        estimate probabilities (that sum to 1) for the most likely outcomes.
        Return ONLY valid JSON: an array of {"outcome": string, "probability": 0–1} objects.
        News Snippets: ${snippets}`;

        const reply = await askOpenAI(prompt);

        // Parse the response as a JSON
        let data;
        try {
            data = JSON.parse(reply);
        } catch (e) {
            return res.status(500).json({ error: 'Failed to parse OpenAI response.' });
        }

        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



