import React, { useEffect, useState } from 'react';

interface User {
  firstName?: string;
  lastName?: string;
  createdAt?: string; // предполагается, что дата в ISO формате
}

const Profile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/user', { credentials: 'include' });
        if (res.ok) {
          const data: User = await res.json();
          setUser(data);
        } else {
          setError('Не удалось загрузить профиль');
        }
      } catch (err) {
        setError('Ошибка сети');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Форматируем дату
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Неизвестно';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) return <div className="profile-loading">Загрузка...</div>;
  if (error) return <div className="profile-error">{error}</div>;

  return (
    <div className="profile-container p-6 max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-300">
      <h2 className="text-3xl font-semibold mb-4 text-center text-blue-700 dark:text-blue-300">Профиль</h2>
      <div className="flex flex-col space-y-3 text-gray-800 dark:text-gray-200">
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Имя:</span>
          <span>{user?.firstName || 'Не указано'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Фамилия:</span>
          <span>{user?.lastName || 'Не указано'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Дата регистрации:</span>
          <span>{formatDate(user?.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default Profile;