import * as schema from '../shared/schema';
import { db } from "./db";
import { eq, desc, and, or, like, count, gt } from "drizzle-orm";

// Интерфейс IStorage
export interface IStorage {
  // Пользователи
  getUser(id: string): Promise<schema.User | undefined>;
  upsertUser(user: schema.UpsertUser): Promise<schema.User>;

  // Источники
  getSources(): Promise<schema.Source[]>;
  getSourceById(id: number): Promise<schema.Source | undefined>;
  createSource(source: schema.InsertSource): Promise<schema.Source>;
  updateSource(id: number, updates: Partial<schema.Source>): Promise<schema.Source | undefined>;
  deleteSource(id: number): Promise<boolean>;

  // Статьи
  getArticles(params?: {
    category?: string;
    sourceId?: number;
    search?: string;
    limit?: number;
    offset?: number;
    publishedAfter?: Date;
  }): Promise<schema.Article[]>;
  getArticleById(id: number): Promise<schema.Article | undefined>;
  getArticleByUrl(url: string): Promise<schema.Article | undefined>;
  createArticle(article: schema.InsertArticle): Promise<schema.Article>;
  updateArticle(id: number, updates: Partial<schema.Article>): Promise<schema.Article | undefined>;
  deleteArticle(id: number): Promise<boolean>;

  // Статистика
  getStats(): Promise<{
    totalArticles: number;
    activeSources: number;
    lastUpdate: string;
  }>;

  // Категории
  getCategories(): Promise<Array<{ name: string; count: number }>>;
}

// Реализация с базой данных
export class DatabaseStorage implements IStorage {
  // Пользователи
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
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  // Источники
  async getSources(): Promise<schema.Source[]> {
    return await db.select().from(schema.sources);
  }

  async getSourceById(id: number): Promise<schema.Source | undefined> {
    const [source] = await db.select().from(schema.sources).where(eq(schema.sources.id, id));
    return source;
  }

  async createSource(insertSource: schema.InsertSource): Promise<schema.Source> {
    const [source] = await db.insert(schema.sources).values(insertSource).returning();
    return source;
  }

  async updateSource(id: number, updates: Partial<schema.Source>): Promise<schema.Source | undefined> {
    const [source] = await db.update(schema.sources).set(updates).where(eq(schema.sources.id, id)).returning();
    return source;
  }

  async deleteSource(id: number): Promise<boolean> {
    const result = await db.delete(schema.sources).where(eq(schema.sources.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Статьи
  async getArticles(params?: {
    category?: string;
    sourceId?: number;
    search?: string;
    limit?: number;
    offset?: number;
    publishedAfter?: Date;
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
      where.push(
        or(
          like(schema.articles.title, searchPattern),
          like(schema.articles.content, searchPattern),
          like(schema.articles.sourceName, searchPattern)
        )
      );
    }
    if (params?.publishedAfter) {
      where.push(gt(schema.articles.publishedAt, params.publishedAfter));
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
    return article;
  }

  async getArticleByUrl(url: string): Promise<schema.Article | undefined> {
    const [article] = await db.select().from(schema.articles).where(eq(schema.articles.url, url));
    return article;
  }

  async createArticle(insertArticle: schema.InsertArticle): Promise<schema.Article> {
    const [article] = await db.insert(schema.articles).values(insertArticle).returning();
    return article;
  }

  async updateArticle(id: number, updates: Partial<schema.Article>): Promise<schema.Article | undefined> {
    const [article] = await db.update(schema.articles).set(updates).where(eq(schema.articles.id, id)).returning();
    return article;
  }

  async deleteArticle(id: number): Promise<boolean> {
    const result = await db.delete(schema.articles).where(eq(schema.articles.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Статистика
  async getStats(): Promise<{ totalArticles: number; activeSources: number; lastUpdate: string }> {
    const [totalArticlesResult] = await db.select({ count: count() }).from(schema.articles);
    const [activeSourcesResult] = await db.select({ count: count() }).from(schema.sources).where(eq(schema.sources.isActive, true));
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

  // Категории
  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    const result = await db
      .select({ name: schema.articles.category, count: count(schema.articles.id) })
      .from(schema.articles)
      .groupBy(schema.articles.category);
    return result.map(row => ({ name: row.name, count: row.count }));
  }
}

// Экспорт по умолчанию
export const storage: IStorage = new DatabaseStorage();
