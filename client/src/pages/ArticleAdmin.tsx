import React, { useState, useEffect } from "react";

interface Article {
  id: number;
  title: string;
  content: string;
  publishedAt: string;
}

const FilteredArticles: React.FC = () => {
  const [date, setDate] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);

  const fetchArticles = async () => {
    let url = "/api/articles";
    if (date) {
      url += `?publishedAfter=${date}`;
    }
    const res = await fetch(url);
    const data = await res.json();
    setArticles(data);
  };

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line
  }, [date]);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <h2>Фильтрация новостей по дате публикации</h2>
      <label>
        Показать новости после даты:
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ marginLeft: 8 }}
        />
      </label>
      <hr />
      <ul>
        {articles.map(article => (
          <li key={article.id} style={{ marginBottom: 24 }}>
            <div>
              <b>{article.title}</b> <br />
              <small>{new Date(article.publishedAt).toLocaleString()}</small>
              <p>{article.content}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default FilteredArticles;
