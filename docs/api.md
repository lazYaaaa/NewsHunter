# NewsFlow API Documentation

## Overview

NewsFlow предоставляет RESTful API для управления RSS новостями, источниками и пользователями.

**Base URL:** `https://your-domain.com/api`

## Authentication

NewsFlow использует Replit Auth для аутентификации пользователей. Большинство endpoints требуют авторизации.

### Auth Endpoints

#### Login
```http
GET /api/login
```
Перенаправляет на страницу авторизации Replit.

#### Logout
```http
GET /api/logout
```
Выход из системы и очистка сессии.

#### Get Current User
```http
GET /api/auth/user
```
**Headers:** `Authorization: Bearer <token>` (handled by session)

**Response:**
```json
{
  "id": "12345",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImageUrl": "https://example.com/avatar.jpg",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

## Sources API

### Get All Sources
```http
GET /api/sources
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "TechCrunch",
    "url": "https://techcrunch.com/feed/",
    "category": "Technology",
    "isActive": true,
    "lastFetched": "2025-01-01T12:00:00Z",
    "articleCount": 150
  }
]
```

### Create Source
```http
POST /api/sources
```

**Body:**
```json
{
  "name": "Example News",
  "url": "https://example.com/rss",
  "category": "General",
  "isActive": true
}
```

**Response:** `201 Created`

### Delete Source
```http
DELETE /api/sources/{id}
```

**Response:** `204 No Content`

## Articles API

### Get Articles
```http
GET /api/articles
```

**Query Parameters:**
- `category` (string, optional) - Фильтр по категории
- `sourceId` (number, optional) - Фильтр по источнику
- `search` (string, optional) - Поиск по заголовку и содержимому
- `limit` (number, optional, default: 20) - Количество статей
- `offset` (number, optional, default: 0) - Смещение для пагинации

**Example:**
```http
GET /api/articles?category=Technology&limit=10&offset=0
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "Breaking: New AI Breakthrough",
    "content": "<p>Full article content...</p>",
    "excerpt": "Brief summary of the article...",
    "url": "https://source.com/article",
    "imageUrl": "https://source.com/image.jpg",
    "category": "Technology",
    "sourceId": 1,
    "sourceName": "TechCrunch",
    "publishedAt": "2025-01-01T10:00:00Z",
    "views": 25,
    "comments": 5,
    "shares": 10
  }
]
```

### Get Single Article
```http
GET /api/articles/{id}
```

Просмотр статьи увеличивает счетчик views на 1.

### Create Article
```http
POST /api/articles
```

## Categories API

### Get Categories
```http
GET /api/categories
```

**Response:**
```json
[
  {
    "name": "Technology",
    "count": 45
  },
  {
    "name": "General", 
    "count": 32
  }
]
```

## Stats API

### Get Statistics
```http
GET /api/stats
```

**Response:**
```json
{
  "totalArticles": 157,
  "activeSources": 3,
  "lastUpdate": "15 min"
}
```

## RSS Management

### Refresh All Feeds
```http
POST /api/refresh
```

Запускает обновление всех активных RSS лент.

**Response:**
```json
{
  "message": "Refresh completed. Added 25 new articles.",
  "newArticles": 25
}
```

## Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "details": ["Additional error details"]
}
```

### HTTP Status Codes
- `200` - OK
- `201` - Created  
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error