import * as schema from '../shared/schema';
import { db } from "./db";
import { eq, desc, and, or, like, count, gt } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import { sql } from "drizzle-orm";

export class DatabaseStorage implements schema.IStorage {
  // Пользователи
  async getUser(id: string): Promise<schema.User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }
  async getArticleLikesCount(articleId: number): Promise<number> {
    const article = await this.getArticleById(articleId);
    return article?.likes ?? 0;
  }

  async getCommentsCount(articleId: number): Promise<number> {
    const comments = await this.getCommentsByArticleId(articleId);
    return comments.length;
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

  async createSource(source: schema.InsertSource): Promise<schema.Source> {
    const [src] = await db.insert(schema.sources).values(source).returning();
    return src;
  }

  async updateSource(id: number, updates: Partial<schema.Source>): Promise<schema.Source | undefined> {
    const [src] = await db.update(schema.sources).set(updates).where(eq(schema.sources.id, id)).returning();
    return src;
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
      const pattern = `%${params.search}%`;
      where.push(
        or(
          like(schema.articles.title, pattern),
          like(schema.articles.content, pattern),
          like(schema.articles.sourceName, pattern)
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

  async createArticle(article: schema.InsertArticle): Promise<schema.Article> {
    const [art] = await db.insert(schema.articles).values(article).returning();
    return art;
  }

  async updateArticle(id: number, updates: Partial<schema.Article>): Promise<schema.Article | undefined> {
    const [art] = await db.update(schema.articles).set(updates).where(eq(schema.articles.id, id)).returning();
    return art;
  }

  async deleteArticle(id: number): Promise<boolean> {
    const result = await db.delete(schema.articles).where(eq(schema.articles.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Статистика
  async getStats(): Promise<{ totalArticles: number; activeSources: number; lastUpdate: string }> {
    const [totalResult] = await db.select({ count: count() }).from(schema.articles);
    const [activeSourcesResult] = await db.select({ count: count() }).from(schema.sources).where(eq(schema.sources.isActive, true));
    const [latest] = await db
      .select({ publishedAt: schema.articles.publishedAt })
      .from(schema.articles)
      .orderBy(desc(schema.articles.publishedAt))
      .limit(1);
    const lastUpdate = latest?.publishedAt || new Date();
    const minutesAgo = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 60000);
    const lastUpdateStr = minutesAgo < 60 ? `${minutesAgo} min` : `${Math.floor(minutesAgo / 60)} hours`;
    return {
      totalArticles: totalResult.count,
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
    return result.map(r => ({ name: r.name, count: r.count }));
  }

  // --- Методы для комментариев ---

  // Получение комментариев по статье
  async getCommentsByArticleId(articleId: number): Promise<schema.Comment[]> {
    return await db.select().from(schema.comments).where(eq(schema.comments.articleId, articleId)).orderBy(desc(schema.comments.createdAt));
  }

  // Создание комментария
  async createComment(comment: { articleId: number; authorId: string; content: string }): Promise<schema.Comment> {
    const newComment = {
      id: uuidv4(),
      articleId: comment.articleId,
      authorId: comment.authorId,
      content: comment.content,
      createdAt: new Date(),
    };
    const [created] = await db.insert(schema.comments).values(newComment).returning();
    return created;
  }

  // Удаление комментария
  async deleteComment(id: string): Promise<boolean> {
    const result = await db.delete(schema.comments).where(eq(schema.comments.id, id));
    return (result.rowCount || 0) > 0;
  }

  // --- Методы для лайков ---

  // Увеличение лайков
  async incrementLikes(articleId: number): Promise<void> {
    await db
      .update(schema.articles)
      .set({ likes: sql`${schema.articles.likes} + 1` })
      .where(eq(schema.articles.id, articleId));
    // После обновления также обновляем счетчик комментариев
    await this.updateCommentsCount(articleId, (await this.getArticleById(articleId))?.comments || 0);
  }

  // Уменьшение лайков
  async decrementLikes(articleId: number): Promise<void> {
    await db
      .update(schema.articles)
      .set({ likes: sql`${schema.articles.likes} - 1` })
      .where(eq(schema.articles.id, articleId));
    // После обновления также обновляем счетчик комментариев
    await this.updateCommentsCount(articleId, (await this.getArticleById(articleId))?.comments || 0);
  }

  // Обновление количества комментариев (если нужно)
  async updateCommentsCount(articleId: number, count: number): Promise<void> {
    await db
      .update(schema.articles)
      .set({ comments: count })
      .where(eq(schema.articles.id, articleId));
  }
}

export const storage: schema.IStorage = new DatabaseStorage();