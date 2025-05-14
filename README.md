# Least-Biased News Finder

This web app helps users find the least-biased news articles on any topic by analyzing recent articles using OpenAI's language model and NewsAPI.

## Features

- Users enter a topic in the search bar
- The app fetches recent articles related to that topic using NewsAPI
- OpenAI is used to analyze and rate each article for bias
- The three least-biased articles are returned with bias scores
- Results are displayed as clickable links with a percentage-based bias score

## Tech Stack

- **Frontend:** React (Create React App)
- **Backend:** Node.js with Express
- **APIs Used:**
  - [NewsAPI](https://newsapi.org/)
  - [OpenAI API](https://platform.openai.com/)
