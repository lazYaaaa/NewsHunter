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

      if (!email || !password) {
        return res.status(400).json({ 
          success: false,
          message: 'Email and password are required' 
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid credentials' 
        });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ 
          success: false,
          message: 'Invalid credentials' 
        });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      res.cookie('token', token, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000
      });

      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Internal server error' 
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

  // 10. 404 handler должен быть последним
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  const httpServer = createServer(app);
  return httpServer;
}
