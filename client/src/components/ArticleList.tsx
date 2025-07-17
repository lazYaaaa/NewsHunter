import React, { useEffect, useState } from 'react';
import { ArticleCard } from './ArticleCard.tsx';
import { useDebounce } from '../hooks/useDebounce.ts';
import Filters from '../pages/Filters.tsx';

interface Article {
    id: number;
    title: string;
    excerpt: string;
    url: string;
    imageUrl?: string;
    publishedAt?: string;
    sourceName?: string;
}

export const ArticleList: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [date, setDate] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [warnings, setWarnings] = useState<string[]>([]); // для ворнингов

    const debouncedSearchQuery = useDebounce(searchQuery, 600);

    const fetchArticles = (reset = false) => {
        let url = `/api/articles?limit=12&offset=${reset ? 0 : (page - 1) * 12}`;

        if (date) {
            const isoDate = `${date}T00:00:00`;
            url += `&publishedAfter=${encodeURIComponent(isoDate)}`;
        }

        if (debouncedSearchQuery) {
            url += `&search=${encodeURIComponent(debouncedSearchQuery)}`;
        }

        setLoading(true);
        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error('Network response was not ok');
                return res.json();
            })
            .then(data => {
                if (reset) {
                    setArticles(data);
                } else {
                    setArticles(prev => [...prev, ...data]);
                }
                setHasMore(data.length === 12);
                setLoading(false);
            })
            .catch(error => {
                console.error('Fetch error:', error);
                setLoading(false);
            });
    };

    useEffect(() => {
        setPage(1);
        fetchArticles(true);
    }, [debouncedSearchQuery, date]);

    useEffect(() => {
        if (page > 1) fetchArticles();
    }, [page]);

    const handleReset = () => {
        setSearchQuery('');
        setDate('');
        setPage(1);
    };

    const handleRefresh = async () => {
        setLoading(true);
        setWarnings([]); // очистить ворнинги перед новым обновлением
        try {
            const response = await fetch('/api/refresh', {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error('Refresh failed');
            }

            const result = await response.json();
            console.log('Refresh result:', result);

            // Добавляем ворнинги из ответа
            if (result.warnings && result.warnings.length > 0) {
                setWarnings(prev => [...prev, ...result.warnings]);
            }

            // Обновляем список статей
            await fetchArticles(true);
        } catch (error) {
            console.error('Refresh error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col items-stretch bg-white dark:bg-gray-900 p-4 rounded-lg shadow-xl">
            {/* Ворнинги */}
            {warnings.length > 0 && (
                <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded">
                    <h4 className="font-semibold mb-2">Внимание:</h4>
                    <ul className="list-disc list-inside">
                        {warnings.map((warn, index) => (
                            <li key={index}>{warn}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Фильтры и кнопки */}
            <div className="flex flex-col sm:flex-row items-center justify-between w-full mb-8 gap-4">
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Поиск по статьям..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-900"
                        />
                        <svg
                            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>

                    <label className="font-semibold text-lg flex items-center gap-2 bg-blue-100 dark:bg-gray-800 px-4 py-2 rounded shadow">
                        <span>Дата:</span>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="px-2 py-1 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-900"
                        />
                    </label>
                </div>

                <div className="flex gap-2 mt-2 sm:mt-0">
                    {(date || searchQuery) && (
                        <button
                            onClick={handleReset}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded shadow"
                        >
                            Сбросить
                        </button>
                    )}
                    <button
                        onClick={handleRefresh}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow transition-all duration-200"
                    >
                        Обновить
                    </button>
                </div>
            </div>

            {/* Компонент фильтров */}
            <Filters />

            {/* Загрузка */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
                </div>
            )}

            {/* Нет данных */}
            {!loading && !articles.length && (
                <div className="text-lg text-gray-500 dark:text-gray-400 mt-8 text-center">
                    {searchQuery || date
                        ? `Ничего не найдено${searchQuery ? ` по запросу "${searchQuery}"` : ''}${date ? ` после ${new Date(date).toLocaleDateString()}` : ''}`
                        : 'Нет новостей.'}
                </div>
            )}

            {/* Список статей */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                {articles.map(article => (
                    <ArticleCard key={article.id} {...article} />
                ))}
            </div>

            {/* Кнопка показать еще */}
            {!loading && hasMore && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={() => setPage((p) => p + 1)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold py-2 px-8 rounded shadow-lg text-lg transition-all duration-200"
                    >
                        Показать ещё
                    </button>
                </div>
            )}
        </div>
    );
};
