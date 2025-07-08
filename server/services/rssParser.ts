import { type InsertArticle } from '../../shared/schema';

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
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const xmlText = await response.text();
      return this.parseXML(xmlText, url);
    } catch (error) {
      console.error(`Error parsing ${url}:`, error);
      return [];
    }
  }

  private parseXML(xmlText: string, feedUrl: string): FeedItem[] {
    const items: FeedItem[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];
      const link = this.extractValue(itemXml, ['link', 'guid', 'url']) || '';
      
      const item: FeedItem = {
        title: this.cleanText(this.extractValue(itemXml, ['title']) || 'Untitled'),
        description: this.cleanText(
          this.extractValue(itemXml, ['description', 'content:encoded', 'summary']) || ''
        ),
        link,
        pubdate: this.parseDate(
          this.extractValue(itemXml, ['pubDate', 'dc:date', 'published']) || ''
        ),
        image: this.extractImage(itemXml, link, feedUrl),
        categories: this.extractCategories(itemXml),
      };

      items.push(item);
    }

    return items;
  }

  private extractValue(xml: string, tagNames: string[]): string | null {
    for (const tag of tagNames) {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = xml.match(regex);
      if (match) return match[1].trim();
    }
    return null;
  }

 private extractImage(xml: string, itemLink: string, feedUrl: string): string | undefined {
  console.log('Parsing images in XML segment:', xml);
  const sources = [
    { regex: /<enclosure[^>]+url="([^"]+)"[^>]*type="image[^"]*"/i, type: 'enclosure' },
    { regex: /<media:content[^>]+url="([^"]+)"[^>]*medium="image"/i, type: 'media' },
    { regex: /<media:thumbnail[^>]+url="([^"]+)"/i, type: 'thumbnail' },
    { regex: /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i, type: 'og' },
    { regex: /<image[^>]+href="([^"]+)"/i, type: 'image-tag' },
    { regex: /<img[^>]+src=["']([^"']+)["']/i, type: 'html-img' },
    { regex: /background-image:\s*url\(['"]?([^'")]+)['"]?\)/i, type: 'css-bg' },
  ];

  for (const src of sources) {
    const match = xml.match(src.regex);
    if (match && match[1]) {
      console.log(`Found image with regex ${src.type}:`, match[1]);
      return this.normalizeUrl(match[1], itemLink || feedUrl);
    }
  }

  // Попытка извлечь изображение из содержимого description или content:encoded
  const content = this.extractValue(xml, ['content:encoded', 'description']);
  if (content) {
    const imgMatch = /<img[^>]+src=["']([^"']+)["']/i.exec(content);
    if (imgMatch && imgMatch[1]) {
      console.log('Found image inside HTML content:', imgMatch[1]);
      return this.normalizeUrl(imgMatch[1], itemLink || feedUrl);
    }
  }

  // Также попробуйте извлечь из <image> тега
  const imageTagMatch = /<image[^>]*>[\s\S]*?<url>([^<]+)<\/url>/i.exec(xml);
  if (imageTagMatch && imageTagMatch[1]) {
    console.log('Found image inside <image> tag:', imageTagMatch[1]);
    return this.normalizeUrl(imageTagMatch[1], itemLink || feedUrl);
  }

  return undefined;
}

  private normalizeUrl(url: string, baseUrl: string): string {
    try {
      if (!url.startsWith('http') && !url.startsWith('data:')) {
        return new URL(url, baseUrl).toString();
      }
      return url.split('?')[0];
    } catch (e) {
      console.warn('URL normalization failed:', url);
      return url;
    }
  }

  private extractCategories(xml: string): string[] {
    const categories: string[] = [];
    const regex = /<(category|dc:subject)[^>]*>([^<]+)</gi;
    let match;
    
    while ((match = regex.exec(xml)) !== null) {
      categories.push(match[2].trim());
    }
    return categories.length > 0 ? categories : [];
  }

  private parseDate(dateStr: string): Date {
    try {
      return new Date(dateStr) || new Date();
    } catch {
      return new Date();
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, ' ')
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
      title: item.title.substring(0, 255), // Ограничение длины
      content: item.description,
      excerpt: this.extractExcerpt(item.description),
      url: item.link.substring(0, 512), // Ограничение длины URL
      imageUrl: item.image?.substring(0, 512) || null, // Ограничение длины
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
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }
}
