import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext.js'; 

export type Comment = {
  id: string;
  articleId: number;
  authorId: string;
  content: string;
  createdAt: Date | null;
};

interface Article {
  id: number;
  title: string;
  excerpt: string;
  url: string;
  imageUrl?: string;
  publishedAt?: string;
  sourceName?: string;
  initialLikes?: number;
  initialComments?: number;
  likedByUser?: boolean;
  comments?: Comment[];
}

export const ArticleCard: React.FC<Article> = ({
  id,
  title,
  excerpt,
  url,
  imageUrl,
  publishedAt,
  sourceName,
  initialLikes = 0,
  initialComments = 0,
  likedByUser = false,
  comments: initialCommentsList = [],
}) => {
  const { user } = useContext(UserContext) ?? { user: null };

  const [likesCount, setLikesCount] = useState<number>(initialLikes);
  const [commentsCount, setCommentsCount] = useState<number>(initialComments);
  const [liked, setLiked] = useState<boolean>(likedByUser);
  const [comments, setComments] = useState<Comment[]>(initialCommentsList);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const warningMessage = 'Пожалуйста, авторизуйтесь, чтобы поставить лайк или просматривать комментарии.';

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/articles/${id}/stats`);
      if (res.ok) {
        const data = await res.json();
        setLikesCount(data.likes);
        setCommentsCount(data.commentsCount);
      }
    } catch (error) {
      console.error('Ошибка при получении статов:', error);
    }
  };

  useEffect(() => {
    fetchStats();
    if (user) {
    fetch(`/api/articles/${id}/liked`, {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && typeof data.liked === 'boolean') {
          setLiked(data.liked);
        }
      })
      .catch(console.error);
  }
  }, [id, user]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setShowWarning(true);
      return;
    }
    setLoading(true);
    try {
      if (!liked) {
        await fetch(`/api/articles/${id}/like`, { method: 'POST', credentials: 'include' });
        setLiked(true);
      } else {
        await fetch(`/api/articles/${id}/dislike`, { method: 'POST', credentials: 'include' });
        setLiked(false);
      }
      await fetchStats();
    } catch (error) {
      console.error('Ошибка при лайке:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/articles/${id}/comments`);
      if (res.ok) {
        const data: Comment[] = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки комментариев:', err);
    }
  };

  const handleShowComments = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fetchComments();
    setShowCommentsModal(true);
  };

  const handleAddComment = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      setShowWarning(true);
      return;
    }
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/articles/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        const addedComment: Comment = await res.json();
        setComments(prev => [addedComment, ...prev]);
        await fetchStats();
        setCommentsCount(prev => prev + 1);
        setNewComment('');
      }
    } catch (err) {
      console.error('Ошибка добавления комментария:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderComments = () => {
    if (!Array.isArray(comments) || comments.length === 0) {
      return <p className="text-gray-600 dark:text-gray-300">Нет комментариев.</p>;
    }
    return comments.map((c) => (
      <div key={c.id} className="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold">{c.authorId}</span>
          <span className="text-xs text-gray-500">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
        </div>
        <p>{c.content}</p>
      </div>
    ));
  };

  return (
    <>
      {/* Карточка статьи */}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-2xl hover:-translate-y-1 transition-all bg-cyan-50 dark:bg-gray-900 h-full group"
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
        <div className="flex justify-between items-center mb-3 text-xs text-gray-400">
          {sourceName && <span>{sourceName}</span>}
          {publishedAt && <span>{new Date(publishedAt).toLocaleString()}</span>}
        </div>
        {/* Кнопки */}
        <div className="flex justify-center space-x-8 mt-4">
          {/* Лайк */}
          <button
            onClick={handleLikeToggle}
            className="flex items-center space-x-2 focus:outline-none"
            disabled={loading}
          >
            <svg
              className={`w-6 h-6 transition-colors duration-300 ${liked ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="text-gray-800 dark:text-gray-200">{likesCount}</span>
          </button>

          {/* Комментарии */}
          <button
            onClick={handleShowComments}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-green-500 focus:outline-none"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
            </svg>
            <span>{commentsCount}</span>
          </button>
        </div>
      </a>

      {/* Предупреждение */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-sm w-full shadow-lg relative">
            <h3 className="text-lg font-semibold mb-4 text-center text-gray-800 dark:text-gray-200">Внимание</h3>
            <p className="mb-4 text-center text-gray-700 dark:text-gray-300">{warningMessage}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowWarning(false)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded transition"
              >
                ОК
              </button>
              <a
                href="/login"
                className="w-full text-center block bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition"
              >
                Войти / Регистрация
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Комментарии */}
      {showCommentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-xl p-6 relative overflow-y-auto max-h-full">
            <h3 className="text-xl font-semibold mb-4">Комментарии</h3>
            <div className="mb-4 max-h-96 overflow-y-auto">{renderComments()}</div>
            {/* Ввод комментария */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Ваш комментарий..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-grow border border-gray-300 dark:border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-900"
              />
              <button
                onClick={handleAddComment}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded transition"
                disabled={loading}
              >
                Отправить
              </button>
            </div>
            {/* Закрытие */}
            <button
              onClick={() => setShowCommentsModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};
