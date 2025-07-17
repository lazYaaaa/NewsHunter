import React, { useState, useEffect } from 'react'
import {
  PlusIcon,
  TrashIcon
} from '@heroicons/react/20/solid'

interface Source {
  id: number;
  name: string;
  url: string;
  category: string;
}

interface Category {
  id: number;
  name: string;
}

const Filters: React.FC = () => {
  const [sources, setSources] = useState<Source[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newSourceCategory, setNewSourceCategory] = useState('')
  const [showSourceMenu, setShowSourceMenu] = useState(false)

  // Загрузка существующих источников
  useEffect(() => {
    fetch('/api/sources')
      .then(res => res.json())
      .then(data => setSources(data))
      .catch(console.error)
  }, [])

  // Загрузка категорий
  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(console.error)
  }, [])

  // Добавление нового источника
  const handleAddSource = () => {
    if (!newSourceName || !newSourceUrl || !newSourceCategory) {
      alert('Пожалуйста, заполните все поля');
      return;
    }

    fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name: newSourceName, 
        url: newSourceUrl,
        category: newSourceCategory 
      }),
    })
      .then(res => res.json())
      .then((newSrc) => {
        setSources(prev => [...prev, newSrc])
        setNewSourceName('')
        setNewSourceUrl('')
        setNewSourceCategory('')
        setShowSourceMenu(false)
      })
      .catch(console.error)
  }

  // Удаление источника
  const handleDeleteSource = (id: number) => {
    fetch(`/api/sources/${id}`, { method: 'DELETE' })
      .then(res => {
        if (res.ok) {
          setSources(prev => prev.filter(src => src.id !== id))
        }
      })
      .catch(console.error)
  }

  return (
    <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md max-w-2xl mx-auto">
      {/* Источники */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-lg">Источники</h3>
          {/* Кнопка для открытия/закрытия меню добавления */}
          <button
            onClick={() => setShowSourceMenu(prev => !prev)}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-label="Добавить источник"
          >
            <PlusIcon className="w-5 h-5 text-green-500" />
          </button>
        </div>
      </div>
      {/* Форма добавления */}
      {showSourceMenu && (
        <div className="mb-4 flex flex-col space-y-3 max-w-sm mx-auto bg-white dark:bg-gray-700 p-4 rounded-lg shadow-md transition-all duration-300">
          <input
            type="text"
            placeholder="Название источника"
            value={newSourceName}
            onChange={(e) => setNewSourceName(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            placeholder="URL источника"
            value={newSourceUrl}
            onChange={(e) => setNewSourceUrl(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {/* Выпадающее меню категорий */}
          <select
            value={newSourceCategory}
            onChange={(e) => setNewSourceCategory(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Выберите категорию</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          <button
            onClick={handleAddSource}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
          >
            Добавить
          </button>
        </div>
      )}
      {/* Отображение источников */}
      <div className="flex flex-wrap gap-2 justify-center">
        {sources.map((src) => (
          <div key={src.id} className="flex items-center bg-green-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm font-semibold shadow-sm">
            {src.name}
            <button
              onClick={() => handleDeleteSource(src.id)}
              className="ml-2 text-red-500 hover:text-red-700"
              aria-label="Удалить источник"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Filters