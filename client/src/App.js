import { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [q, setQ] = useState('');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;

    setLoading(true);
    setError('');
    setArticles([]);

    try {
      const res = await axios.get(`${API_BASE}/api/neutral`, {
        params: { q }
      });
      setArticles(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to fetch articles.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Least-Biased News Finder</h1>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter a topic (e.g. climate change)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button disabled={loading}>
          {loading ? 'Searching…' : 'Find Articles'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {articles.length > 0 && (
        <ul className="result-list">
          {articles.map(({ title, url, bias_score }, i) => (
            <li key={i} className="result-item">
              <a href={url} target="_blank" rel="noopener noreferrer">
                {title}
              </a>
              <div className="bias-score">
                Bias score: {(parseFloat(bias_score) * 100)}%
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
