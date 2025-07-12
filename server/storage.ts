import * as schema from '../shared/schema';
import { db } from "./db";
import { eq, desc, and, or, like, count } from "drizzle-orm";
import { RSSParser } from './services/rssParser';

export interface IStorage {
  // Users (for Replit Auth)
  getUser(id: string): Promise<schema.User | undefined>;
  upsertUser(user: schema.UpsertUser): Promise<schema.User>;

  // Sources
  getSources(): Promise<schema.Source[]>;
  getSourceById(id: number): Promise<schema.Source | undefined>;
  createSource(source: schema.InsertSource): Promise<schema.Source>;
  updateSource(id: number, updates: Partial<schema.Source>): Promise<schema.Source | undefined>;
  deleteSource(id: number): Promise<boolean>;

  // Articles
  getArticles(params?: {
    category?: string;
    sourceId?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<schema.Article[]>;
  getArticleById(id: number): Promise<schema.Article | undefined>;
  getArticleByUrl(url: string): Promise<schema.Article | undefined>;
  createArticle(article: schema.InsertArticle): Promise<schema.Article>;
  updateArticle(id: number, updates: Partial<schema.Article>): Promise<schema.Article | undefined>;
  deleteArticle(id: number): Promise<boolean>;

  // Stats
  getStats(): Promise<{
    totalArticles: number;
    activeSources: number;
    lastUpdate: string;
  }>;

  // Categories
  getCategories(): Promise<Array<{ name: string; count: number }>>;
  
}

export class MemStorage implements IStorage {
  private sources: Map<number, schema.Source>;
  private articles: Map<number, schema.Article>;
  private users: Map<string, schema.User> = new Map();
  private currentSourceId: number;
  private currentArticleId: number;

  constructor() {
    this.sources = new Map();
    this.articles = new Map();
    this.currentSourceId = 1;
    this.currentArticleId = 1;

    // Initialize with some default sources
    this.initializeDefaultSources();
  }

  private async initializeDefaultSources() {
    const defaultSources: schema.InsertSource[] = [
      { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Technology", isActive: true },
      { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "General", isActive: true },
      { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Technology", isActive: true },
    ];

    for (const source of defaultSources) {
      await this.createSource(source);
    }
  }

  async getUser(id: string): Promise<schema.User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(user: schema.UpsertUser): Promise<schema.User> {
    const existing = this.users.get(user.id);
    const newUser: schema.User = { ...user, createdAt: existing?.createdAt || new Date(), updatedAt: new Date() } as schema.User;
    this.users.set(user.id, newUser);
    return newUser;
  }

  async getSources(): Promise<schema.Source[]> {
    return Array.from(this.sources.values());
  }

  async getSourceById(id: number): Promise<schema.Source | undefined> {
    return this.sources.get(id);
  }

  async createSource(insertSource: schema.InsertSource): Promise<schema.Source> {
    const id = this.currentSourceId++;
    const source: schema.Source = {
      ...insertSource,
      id,
      lastFetched: null,
      articleCount: 0,
      isActive: insertSource.isActive ?? true,
    };
    this.sources.set(id, source);
    return source;
  }

  async updateSource(id: number, updates: Partial<schema.Source>): Promise<schema.Source | undefined> {
    const source = this.sources.get(id);
    if (!source) return undefined;

    const updatedSource = { ...source, ...updates };
    this.sources.set(id, updatedSource);
    return updatedSource;
  }

  async deleteSource(id: number): Promise<boolean> {
    return this.sources.delete(id);
  }

  async getArticles(params?: {
    category?: string;
    sourceId?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<schema.Article[]> {
    let articles = Array.from(this.articles.values());

    // Filter by category
    if (params?.category) {
      articles = articles.filter(article => article.category === params.category);
    }

    // Filter by source
    if (params?.sourceId) {
      articles = articles.filter(article => article.sourceId === params.sourceId);
    }

    // Filter by search
    if (params?.search) {
      const search = params.search.toLowerCase();
      articles = articles.filter(article =>
        article.title.toLowerCase().includes(search) ||
        article.content.toLowerCase().includes(search) ||
        article.sourceName.toLowerCase().includes(search)
      );
    }

    // Sort by published date (newest first)
    articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

    // Pagination
    const offset = params?.offset || 0;
    const limit = params?.limit || 20;
    return articles.slice(offset, offset + limit);
  }

  async getArticleById(id: number): Promise<schema.Article | undefined> {
    return this.articles.get(id);
  }

  async getArticleByUrl(url: string): Promise<schema.Article | undefined> {
    return Array.from(this.articles.values()).find(article => article.url === url);
  }

  async createArticle(insertArticle: schema.InsertArticle): Promise<schema.Article> {
    const id = this.currentArticleId++;
    const article: schema.Article = {
      ...insertArticle,
      id,
      views: 0,
      comments: 0,
      shares: 0,
      imageUrl: insertArticle.imageUrl || null,
    };
    this.articles.set(id, article);

    // Update source article count
    const source = this.sources.get(article.sourceId);
    if (source) {
      source.articleCount++;
      this.sources.set(source.id, source);
    }

    return article;
  }

  async updateArticle(id: number, updates: Partial<schema.Article>): Promise<schema.Article | undefined> {
    const article = this.articles.get(id);
    if (!article) return undefined;

    const updatedArticle = { ...article, ...updates };
    this.articles.set(id, updatedArticle);
    return updatedArticle;
  }

  async deleteArticle(id: number): Promise<boolean> {
    const article = this.articles.get(id);
    if (!article) return false;

    const deleted = this.articles.delete(id);
    if (deleted) {
      // Update source article count
      const source = this.sources.get(article.sourceId);
      if (source && source.articleCount > 0) {
        source.articleCount--;
        this.sources.set(source.id, source);
      }
    }
    return deleted;
  }

  async getStats(): Promise<{ totalArticles: number; activeSources: number; lastUpdate: string }> {
    const sources = Array.from(this.sources.values());
    const activeSources = sources.filter(source => source.isActive).length;
    const totalArticles = this.articles.size;
    
    // Find most recent article
    const articles = Array.from(this.articles.values());
    const lastUpdate = articles.length > 0
      ? Math.max(...articles.map(a => a.publishedAt.getTime()))
      : Date.now();
    
    const minutesAgo = Math.floor((Date.now() - lastUpdate) / (1000 * 60));
    const lastUpdateStr = minutesAgo < 60 ? `${minutesAgo} min` : `${Math.floor(minutesAgo / 60)} hours`;

    return {
      totalArticles,
      activeSources,
      lastUpdate: lastUpdateStr,
    };
  }

  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    const articles = Array.from(this.articles.values());
    const categoryMap = new Map<string, number>();

    articles.forEach(article => {
      const count = categoryMap.get(article.category) || 0;
      categoryMap.set(article.category, count + 1);
    });

    return Array.from(categoryMap.entries()).map(([name, count]) => ({ name, count }));
  }
}

export class DatabaseStorage implements IStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<schema.User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async upsertUser(userData: schema.UpsertUser): Promise<schema.User> {
    const [user] = await db
      .insert(schema.users)
      .values(userData)
      .onConflictDoUpdate({
        target: schema.users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async initializeDefaultSources(): Promise<void> {
    // Check if sources already exist
    const existingSources = await db.select().from(schema.sources);
    if (existingSources.length > 0) {
      // Проверим, есть ли статьи
      const existingArticles = await db.select().from(schema.articles);
      if (existingArticles.length === 0) {
        // --- Загрузка реальных новостей через RSSParser ---
        const parser = new RSSParser();
        for (const source of existingSources) {
          const feedItems = await parser.parseFeed(source.url);
          for (const item of feedItems.slice(0, 5)) { // ограничим до 5 новостей на источник
            const article = parser.createArticleFromFeedItem(
              item,
              source.id,
              source.name,
              source.category
            );
            await this.createArticle(article);
          }
        }
        return;
      }
      return; // Sources уже есть
    }

    const defaultSources: schema.InsertSource[] = [
      { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Technology", isActive: true },
      { name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "General", isActive: true },
      { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Technology", isActive: true },
    ];

    for (const source of defaultSources) {
      await this.createSource(source);
    }
  }
  async getSources(): Promise<schema.Source[]> {
    const result = await db.select().from(schema.sources);
    return result;
  }

  async getSourceById(id: number): Promise<schema.Source | undefined> {
    const [source] = await db.select().from(schema.sources).where(eq(schema.sources.id, id));
    return source || undefined;
  }

  async createSource(insertSource: schema.InsertSource): Promise<schema.Source> {
    const [source] = await db
      .insert(schema.sources)
      .values(insertSource)
      .returning();
    return source;
  }

  async updateSource(id: number, updates: Partial<schema.Source>): Promise<schema.Source | undefined> {
    const [source] = await db
      .update(schema.sources)
      .set(updates)
      .where(eq(schema.sources.id, id))
      .returning();
    return source || undefined;
  }

  async deleteSource(id: number): Promise<boolean> {
    const result = await db.delete(schema.sources).where(eq(schema.sources.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getArticles(params?: {
    category?: string;
    sourceId?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<schema.Article[]> {
    const where: any[] = [];
    if (params?.category) {
      where.push(eq(schema.articles.category, params.category));
    }
    if (params?.sourceId) {
      where.push(eq(schema.articles.sourceId, params.sourceId));
    }
    if (params?.search) {
      const searchPattern = `%${params.search}%`;
      where.push(or(
        like(schema.articles.title, searchPattern),
        like(schema.articles.content, searchPattern),
        like(schema.articles.sourceName, searchPattern)
      ));
    }
    const query = db.select().from(schema.articles)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(schema.articles.publishedAt))
      .limit(params?.limit || 20)
      .offset(params?.offset || 0);
    return await query;
  }

  async getArticleById(id: number): Promise<schema.Article | undefined> {
    const [article] = await db.select().from(schema.articles).where(eq(schema.articles.id, id));
    return article || undefined;
  }

  async getArticleByUrl(url: string): Promise<schema.Article | undefined> {
    const [article] = await db.select().from(schema.articles).where(eq(schema.articles.url, url));
    return article || undefined;
  }

  async createArticle(insertArticle: schema.InsertArticle): Promise<schema.Article> {
    const [article] = await db
      .insert(schema.articles)
      .values(insertArticle)
      .returning();
    
    return article;
  }

  async updateArticle(id: number, updates: Partial<schema.Article>): Promise<schema.Article | undefined> {
    const [article] = await db
      .update(schema.articles)
      .set(updates)
      .where(eq(schema.articles.id, id))
      .returning();
    return article || undefined;
  }

  async deleteArticle(id: number): Promise<boolean> {
    const result = await db.delete(schema.articles).where(eq(schema.articles.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getStats(): Promise<{ totalArticles: number; activeSources: number; lastUpdate: string }> {
    const [totalArticlesResult] = await db.select({ count: count() }).from(schema.articles);
    const [activeSourcesResult] = await db.select({ count: count() }).from(schema.sources).where(eq(schema.sources.isActive, true));
    
    // Get most recent article
    const [latestArticle] = await db
      .select({ publishedAt: schema.articles.publishedAt })
      .from(schema.articles)
      .orderBy(desc(schema.articles.publishedAt))
      .limit(1);
    
    const lastUpdate = latestArticle?.publishedAt || new Date();
    const minutesAgo = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60));
    const lastUpdateStr = minutesAgo < 60 ? `${minutesAgo} min` : `${Math.floor(minutesAgo / 60)} hours`;

    return {
      totalArticles: totalArticlesResult.count,
      activeSources: activeSourcesResult.count,
      lastUpdate: lastUpdateStr,
    };
  }

  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    const result = await db
      .select({ 
        name: schema.articles.category, 
        count: count(schema.articles.id) 
      })
      .from(schema.articles)
      .groupBy(schema.articles.category);
    
    return result.map(row => ({ name: row.name, count: row.count }));
  }
  
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();
