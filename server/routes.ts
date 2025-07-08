import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { RSSParser } from "./services/rssParser";
import * as schema from '../shared/schema';
import * as localAuth from './localAuth';
import { z } from "zod";

const rssParser = new RSSParser();

// Используем только локальную авторизацию
const setupAuth = localAuth.setupLocalAuth;
const isAuthenticated = localAuth.isLocalAuthenticated;

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  // Sources endpoints
  app.get("/api/sources", async (req, res) => {
    try {
      const sources = await storage.getSources();
      res.json(sources);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  app.post("/api/sources", async (req, res) => {
    try {
      const sourceData = schema.insertSourceSchema.parse(req.body);
      const source = await storage.createSource(sourceData);
      res.status(201).json(source);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid source data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create source" });
      }
    }
  });

  app.delete("/api/sources/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSource(id);
      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: "Source not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete source" });
    }
  });

  // Articles endpoints
  app.get("/api/articles", async (req, res) => {
    try {
      const { category, sourceId, search, limit, offset, publishedAfter } = req.query;
      let params: any = {
        category: category as string,
        sourceId: sourceId ? parseInt(sourceId as string) : undefined,
        search: search as string,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0,
      };
      // Фильтрация по дате публикации
      if (publishedAfter) {
        const afterDate = new Date(publishedAfter as string);
        params.publishedAfter = afterDate;
      }
      let articles = await storage.getArticles(params);
      // Если фильтрация по дате, применяем фильтр вручную (если не реализовано в storage)
      if (params.publishedAfter) {
        articles = articles.filter(a => a.publishedAt > params.publishedAfter);
      }
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const article = await storage.getArticleById(id);
      if (article) {
        // Increment view count
        await storage.updateArticle(id, { views: article.views + 1 });
        res.json({ ...article, views: article.views + 1 });
      } else {
        res.status(404).json({ error: "Article not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  app.post("/api/articles", async (req, res) => {
    try {
      const articleData = schema.insertArticleSchema.parse(req.body);
      const article = await storage.createArticle(articleData);
      res.status(201).json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid article data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create article" });
      }
    }
  });

  // Обновление новости по ID
  app.put("/api/articles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, content } = req.body;
      const updated = await storage.updateArticle(id, { title, content });
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ error: "Article not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update article" });
    }
  });

  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Categories endpoint
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // RSS refresh endpoint
  app.post("/api/refresh", async (req, res) => {
    try {
      const sources = await storage.getSources();
      let totalNewArticles = 0;

      for (const source of sources.filter(s => s.isActive)) {
        try {
          const feedItems = await rssParser.parseFeed(source.url);
          
          for (const item of feedItems) {
            // Check if article already exists
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

          // Update source last fetched time
          await storage.updateSource(source.id, { lastFetched: new Date() });
        } catch (error) {
          console.error(`Failed to parse feed for source ${source.name}:`, error);
        }
      }

      res.json({ 
        message: `Refresh completed. Added ${totalNewArticles} new articles.`,
        newArticles: totalNewArticles 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh feeds" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
