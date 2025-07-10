import React, { useState, useContext, useEffect } from 'react';
import { useLocation } from 'wouter';
import { UserContext } from '../context/UserContext.tsx';

const Login: React.FC = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useContext must be used within UserProvider');
  }

  const { user, setUser } = context;

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();

  // useEffect для реагирования на изменение user
  useEffect(() => {
    if (user) {
      // После успешной авторизации перенаправляем
      navigate('/');
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server returned: ${text.slice(0, 100)}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка входа');
      }

      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      if (data.user) {
  setUser(data.user);
  if (context.setAuthenticated) {
    context.setAuthenticated(true);
  }
}
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Login failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Если пользователь уже авторизован, показываем сообщение
  if (user) {
    return <div>Вы уже вошли в систему</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded shadow">
        <h2 className="text-2xl font-bold mb-6 text-center">Войти в аккаунт</h2>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Электронная почта
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
              Пароль
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Загрузка...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;