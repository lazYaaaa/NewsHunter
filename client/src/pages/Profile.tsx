import React, { useEffect, useState, useContext } from 'react';
import { UserContext } from '../context/UserContext.tsx';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  createdAt?: string;
}

const Profile: React.FC = () => {
  const { user, setUser } = useContext(UserContext)!;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | undefined>(user?.image);

  // Загружаем данные пользователя
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/auth/user', { credentials: 'include' });
        if (res.ok) {
          const data: User = await res.json();
          setUser(data);
          if (data.image) {
            setProfileImage(data.image);
          }
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
  }, [setUser]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Неизвестно';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-EN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;

    const file = e.target.files[0];
    const tempUrl = URL.createObjectURL(file);
    setProfileImage(tempUrl);
    setUploading(true);

    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      const res = await fetch('/api/auth/upload-profile-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        const data: User = await res.json();
        setUser(data);
        if (data.image) {
          setProfileImage(data.image);
        }
      } else {
        if (user?.image) {
          setProfileImage(user.image);
        }
      }
    } catch (err) {
      if (user?.image) {
        setProfileImage(user.image);
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="profile-loading">Loading...</div>;
  if (error) return <div className="profile-error">{error}</div>;

  return (
    <div className="profile-container p-6 max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md transition-colors duration-300">
      <h2 className="text-3xl font-semibold mb-4 text-center text-blue-700 dark:text-blue-300">Profile</h2>
      
      {/* Фото профиля */}
      <div className="flex justify-center mb-6">
        {profileImage ? (
          <img
            src={profileImage}
            alt="Profile"
            className="w-40 h-40 rounded-full object-cover shadow-lg border-4 border-gray-300 dark:border-gray-600"
          />
        ) : (
          <div className="w-40 h-40 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xl font-semibold shadow-lg border-4 border-gray-300 dark:border-gray-600">
            Нет фото
          </div>
        )}
      </div>

      {/* Загрузка фото */}
      <div className="flex justify-center mb-6">
        <label
          className="cursor-pointer bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg shadow-md transition-colors duration-300 font-semibold text-sm"
          style={{
            backgroundColor: '#4A90E2',
            boxShadow: '0 4px 6px rgba(74, 144, 226, 0.3)',
          }}
        >
          {uploading ? 'Загружается...' : 'Загрузить фото'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Детали профиля */}
      <div className="flex flex-col space-y-3 text-gray-800 dark:text-gray-200">
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">First name:</span>
          <span>{user?.firstName || 'Не указано'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Last name:</span>
          <span>{user?.lastName || 'Не указано'}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Email:</span>
          <span>{user?.email}</span>
        </div>
        <div className="flex justify-between border-b pb-2">
          <span className="font-semibold">Registration date:</span>
          <span>{formatDate(user?.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default Profile;