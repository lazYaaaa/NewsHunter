import React from 'react';

export interface ArticleCardProps {
  title: string;
  excerpt: string;
  url: string;
  imageUrl?: string;
  publishedAt?: string;
  sourceName?: string;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({ title, excerpt, url, imageUrl, publishedAt, sourceName }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="block border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-2xl hover:-translate-y-1 transition-all bg-white dark:bg-gray-900 h-full group"
    style={{ minHeight: 220 }}
  >
    {imageUrl && (
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-40 object-cover rounded mb-3 group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
    )}
    <h2 className="text-xl font-bold mb-2 text-blue-900 dark:text-yellow-300 group-hover:underline">{title}</h2>
    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-3">{excerpt}</p>
    <div className="flex justify-between text-xs text-gray-400">
      {sourceName && <span>{sourceName}</span>}
      {publishedAt && <span>{new Date(publishedAt).toLocaleString()}</span>}
    </div>
  </a>
);
