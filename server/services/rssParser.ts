import { type InsertArticle } from '@shared/schema';

export interface FeedItem {
  title: string;
  description: string;
  link: string;
  pubdate: Date;
  image?: string;
  categories?: string[];
}

export class RSSParser {
  async parseFeed(url: string): Promise<FeedItem[]> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NewsFlow RSS Aggregator 1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      return this.parseXML(xmlText);
    } catch (error) {
      console.error(`Error parsing RSS feed ${url}:`, error);
      return [];
    }
  }

  private parseXML(xmlText: string): FeedItem[] {
    const items: FeedItem[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];

      const title = this.extractTag(itemXml, 'title') || 'Untitled';
      const descriptionRaw = this.extractTag(itemXml, 'description') || this.extractTag(itemXml, 'content:encoded') || '';
      const link = this.extractTag(itemXml, 'link') || this.extractTag(itemXml, 'guid') || '';
      const pubDateStr = this.extractTag(itemXml, 'pubDate') || this.extractTag(itemXml, 'published') || '';

      let pubdate = new Date();
      if (pubDateStr) {
        pubdate = new Date(pubDateStr);
        if (isNaN(pubdate.getTime())) {
          pubdate = new Date();
        }
      }

      // В этом случае оставляем только картинки из BBC
      const image = this.extractBBCImage(itemXml);

      // Категории
      const categories: string[] = [];
      const categoryRegex = /<category[^>]*>([^<]+)<\/category>/gi;
      let categoryMatch;
      while ((categoryMatch = categoryRegex.exec(itemXml)) !== null) {
        categories.push(categoryMatch[1].trim());
      }

      items.push({
        title: this.cleanText(title),
        description: descriptionRaw, // можно оставить HTML или очистить при необходимости
        link: link.trim(),
        pubdate,
        image,
        categories,
      });
    }

    return items;
  }

  private extractTag(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }

  // Только для BBC — извлекает из <media:thumbnail> или <media:content>
  private extractBBCImage(xml: string): string | undefined {
    const mediaThumbnailMatch = xml.match(/<media:thumbnail[^>]+url="([^"]+)"[^>]*>/i);
    if (mediaThumbnailMatch && mediaThumbnailMatch[1]) {
      return this.normalizeUrl(mediaThumbnailMatch[1]);
    }
    const mediaContentMatch = xml.match(/<media:content[^>]+url="([^"]+)"[^>]*>/i);
    if (mediaContentMatch && mediaContentMatch[1]) {
      return this.normalizeUrl(mediaContentMatch[1]);
    }
    return undefined;
  }

  private normalizeUrl(url: string): string {
    try {
      if (!url.startsWith('http') && !url.startsWith('data:')) {
        return new URL(url).toString();
      }
      return url.split('?')[0];
    } catch (e) {
      return url;
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  createArticleFromFeedItem(
    item: FeedItem,
    sourceId: number,
    sourceName: string,
    defaultCategory: string
  ): InsertArticle {
    return {
      title: item.title.substring(0, 255),
      content: item.description,
      excerpt: this.extractExcerpt(item.description),
      url: item.link.substring(0, 512),
      imageUrl: item.image?.substring(0, 512) || null,
      category: (item.categories?.[0] || defaultCategory).substring(0, 100),
      sourceId,
      sourceName: sourceName.substring(0, 100),
      publishedAt: item.pubdate,
    };
  }

  private extractExcerpt(description: string, maxLength: number = 200): string {
    const text = this.cleanText(description);
    if (text.length <= maxLength) return text;
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }
}
