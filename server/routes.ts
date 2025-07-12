import type { Express } from "express";
import express, { Request, Response } from 'express';
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { RSSParser } from "./services/rssParser";
import * as schema from '../shared/schema';
import * as localAuth from './localAuth';
import { z } from "zod";
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { isLocalAuthenticated } from './localAuth';
import 'express-session';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'de7ivcdqi',      // замените на ваше название облака
  api_key: '714875767842575',      // замените на ваш API ключ
  api_secret: 'gOAtHtQifAYGwRcjbyfSwl2ftDI' // замените на ваш API секрет
});
const uploadDir = path.join(__dirname, 'uploads', 'profile-images');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      cb(null, filename);
    },
  }),
  limits: { fileSize: 1024 * 1024 * 5 },
});

declare module 'express-session' {
  interface SessionData {
    userId?: string; // добавьте ваше свойство
  }
}

interface AuthenticatedRequest extends Request {
  user?: typeof users.$inferSelect;
}


const rssParser = new RSSParser();


export async function registerRoutes(app: Express): Promise<Server> {
  // 1. Middleware должны быть первыми
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());

  // 2. Инициализация аутентификации
  await localAuth.setupLocalAuth(app);

  // 3. Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // 4. Auth routes
  app.post('/api/register', async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const [newUser] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          email,
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        });

      return res.status(201).json({ user: newUser });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Registration failed' });
    }
  });

 app.post('/api/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Проверка обязательных полей
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email и пароль обязательны' 
      });
    }

    // Поиск пользователя по email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Неверные учетные данные' 
      });
    }

    // Проверка пароля
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Неверные учетные данные' 
      });
    }

    // Генерация JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Установка куки с токеном
    req.session.userId = user.id;
await req.session.save();

return res.json({
  success: true,
  message: 'Успешный вход',
  user: {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName
  }
});
  } catch (error) {
    console.error('Ошибка входа:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Ошибка сервера' 
    });
  }
});

  // 5. Articles endpoints
  app.get("/api/articles", async (req: Request, res: Response) => {
    try {
      const { category, sourceId, search, limit, offset, publishedAfter } = req.query;
      
      const params = {
        category: category as string | undefined,
        sourceId: sourceId ? parseInt(sourceId as string) : undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
        publishedAfter: publishedAfter ? new Date(publishedAfter as string) : undefined
      };

      const articles = await storage.getArticles(params);
      return res.json(articles);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      return res.status(500).json({ 
        error: "Failed to fetch articles",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.get("/api/articles/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const article = await storage.getArticleById(id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      await storage.updateArticle(id, { views: article.views + 1 });
      return res.json({ ...article, views: article.views + 1 });
    } catch (error) {
      console.error('Failed to fetch article:', error);
      return res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  // 6. Sources endpoints
  app.get("/api/sources", async (req: Request, res: Response) => {
    try {
      const sources = await storage.getSources();
      return res.json(sources);
    } catch (error) {
      console.error('Failed to fetch sources:', error);
      return res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  app.post("/api/sources", async (req: Request, res: Response) => {
    try {
      const sourceData = schema.insertSourceSchema.parse(req.body);
      const source = await storage.createSource(sourceData);
      return res.status(201).json(source);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid source data", 
          details: error.errors 
        });
      }
      console.error('Failed to create source:', error);
      return res.status(500).json({ error: "Failed to create source" });
    }
  });

  app.delete("/api/sources/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSource(id);
      if (deleted) {
        return res.status(204).send();
      }
      return res.status(404).json({ error: "Source not found" });
    } catch (error) {
      console.error('Failed to delete source:', error);
      return res.status(500).json({ error: "Failed to delete source" });
    }
  });

  // 7. Stats endpoint
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const stats = await storage.getStats();
      return res.json(stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      return res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // 8. Categories endpoint
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getCategories();
      return res.json(categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      return res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // 9. RSS refresh endpoint
  app.post("/api/refresh", async (req: Request, res: Response) => {
    try {
      const sources = await storage.getSources();
      let totalNewArticles = 0;

      for (const source of sources.filter(s => s.isActive)) {
        try {
          const feedItems = await rssParser.parseFeed(source.url);
          
          for (const item of feedItems) {
            const existing = await storage.getArticleByUrl(item.link);
            if (!existing) {
              const articleData = rssParser.createArticleFromFeedItem(
                item, 
                source.id, 
                source.name, 
                source.category
              );
              await storage.createArticle(articleData);
              totalNewArticles++;
            }
          }

          await storage.updateSource(source.id, { lastFetched: new Date() });
        } catch (error) {
          console.error(`Failed to parse feed for source ${source.name}:`, error);
        }
      }

      return res.json({ 
        message: `Refresh completed. Added ${totalNewArticles} new articles.`,
        newArticles: totalNewArticles 
      });
    } catch (error) {
      console.error('Failed to refresh feeds:', error);
      return res.status(500).json({ error: "Failed to refresh feeds" });
    }
  });
app.get('/api/auth/user', isLocalAuthenticated, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: authReq.user.id,
    email: authReq.user.email,
    firstName: authReq.user.firstName,
    lastName: authReq.user.lastName,
    createdAt: authReq.user.createdAt,
    image : authReq.user.profileImageUrl
  });
});
app.post('/api/logout', (req: Request, res: Response) => {
  // Проверяем, есть ли у пользователя сессия
  if (req.session) {
    // Удаляем userId из сессии
    req.session.destroy(err => {
      if (err) {
        console.error('Ошибка при выходе из системы:', err);
        return res.status(500).json({ error: 'Не удалось выйти из системы' });
      }
      // Можно отправить успешный ответ
      res.json({ message: 'Вы успешно вышли' });
    });
  } else {
    res.status(200).json({ message: 'Вы уже вышли' });
  }
});
// Обработка загрузки фото профиля
app.post('/api/auth/upload-profile-image', isLocalAuthenticated, upload.single('profileImage'), async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'Файл не выбран' });
  }

  try {
    // Загружаем файл в Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'profile_images', // папка в облаке (опционально)
      public_id: `${authReq.user.id}-${Date.now()}`, // уникальный id
    });

    const imageUrl = result.secure_url; // URL изображения из Cloudinary

    // Обновляем пользователя в базе
    await db
      .update(users)
      .set({ profileImageUrl: imageUrl })
      .where(eq(users.id, authReq.user.id));

    // Получаем обновленного пользователя
    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, authReq.user.id));

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      createdAt: updatedUser.createdAt,
      profileImageUrl: updatedUser.profileImageUrl,
    });
  } catch (error) {
    console.error('Ошибка загрузки в Cloudinary:', error);
    res.status(500).json({ error: 'Ошибка при загрузке изображения' });
  }
});

  // 10. 404 handler должен быть последним
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
