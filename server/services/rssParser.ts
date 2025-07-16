import { type InsertArticle } from '@shared/schema';

export interface FeedItem {
  title: string;
  description: string;
  link: string;
  pubdate: Date;
  image?: string;
  categories?: string[];
  fullContent?: string;
  sourceId?: number;
  sourceName?: string;
}

export class RSSParser {
  private readonly imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
  private readonly userAgent = 'NewsFlow RSS Aggregator 3.0';
  private readonly maxRedirects = 3;
  public fetchFullPage = false;
  public enableImageFetch = true;

  async parseFeed(url: string, sourceId?: number, sourceName?: string): Promise<FeedItem[]> {
    try {
      const response = await this.fetchWithRedirects(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const items = await this.parseXML(await response.text());
      return items.map(item => ({
        ...item,
        sourceId,
        sourceName
      }));
    } catch (error) {
      console.error(`Error parsing RSS feed ${url}:`, error);
      return [];
    }
  }

  private async fetchWithRedirects(url: string, redirectCount = 0): Promise<Response> {
    const response = await fetch(url, {
      headers: { 'User-Agent': this.userAgent },
      redirect: 'manual'
    });

    if (response.status >= 300 && response.status < 400 && redirectCount < this.maxRedirects) {
      const location = response.headers.get('location');
      if (location) {
        return this.fetchWithRedirects(new URL(location, url).toString(), redirectCount + 1);
      }
    }
    return response;
  }

  private async parseXML(xmlText: string): Promise<FeedItem[]> {
    const items: FeedItem[] = [];
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
      try {
        const itemXml = itemMatch[1];
        const link = this.extractFirstValidLink(itemXml);
        let description = this.extractTag(itemXml, 'description') || 
                        this.extractTag(itemXml, 'content:encoded') || '';

        // Специальная обработка для Hacker News
        if (link.includes('news.ycombinator.com') && description.startsWith('<a href="')) {
          description = `Link to discussion: ${link}`;
        }

        const feedItem: FeedItem = {
          title: this.cleanText(this.extractTag(itemXml, 'title') || 'Untitled'),
          description,
          link,
          pubdate: this.parseDate(itemXml),
          categories: this.extractCategories(itemXml),
        };

        if (this.enableImageFetch) {
          feedItem.image = await this.extractBestImage(itemXml, link);
        }

        if (this.fetchFullPage || this.needsFullContent(link)) {
          try {
            const { content, images } = await this.fetchAndParseArticle(link);
            feedItem.fullContent = content;
            if (!feedItem.image && images.length > 0) {
              feedItem.image = images[0];
            }
          } catch (error) {
            console.error(`Failed to fetch full content for ${link}:`, error);
          }
        }

        items.push(feedItem);
      } catch (error) {
        console.error('Error processing RSS item:', error);
      }
    }

    return items;
  }

  private async fetchAndParseArticle(url: string): Promise<{ content: string; images: string[] }> {
    const html = await this.fetchArticleContent(url);
    
    // Специальная обработка для TechCrunch
    if (url.includes('techcrunch.com')) {
      const jsonLd = this.extractJsonLd(html);
      if (jsonLd?.articleBody) {
        return {
          content: jsonLd.articleBody,
          images: jsonLd.image ? [jsonLd.image.url] : []
        };
      }
    }

    return {
      content: this.extractMainContent(html),
      images: this.extractAllImages(html, url)
    };
  }

  private extractJsonLd(html: string): { articleBody?: string; image?: { url: string } } | null {
    const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i;
    const match = html.match(scriptRegex);
    if (!match) return null;

    try {
      const json = JSON.parse(match[1]);
      if (json['@graph']) {
        // Обработка структуры с @graph
        const article = json['@graph'].find((item: any) => item['@type'] === 'Article');
        return article || null;
      }
      return json;
    } catch (e) {
      console.error('Error parsing JSON-LD:', e);
      return null;
    }
  }

  private extractMainContent(html: string): string {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!bodyMatch) return html;

    const body = bodyMatch[1];
    const articleMatch = body.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
                       body.match(/<div[^>]+class=["'].*article["'][^>]*>([\s\S]*?)<\/div>/i);
    
    return articleMatch ? articleMatch[1] : body;
  }

  private extractAllImages(html: string, baseUrl: string): string[] {
    const images = new Set<string>();
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let imgMatch;

    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const url = this.normalizeUrl(imgMatch[1], baseUrl);
      if (this.isImageUrl(url)) {
        images.add(url);
      }
    }

    const metaImage = this.extractMetaImage(html, baseUrl);
    if (metaImage) images.add(metaImage);

    return Array.from(images);
  }

  private needsFullContent(link: string): boolean {
    const domainsRequiringFullContent = [
      'techcrunch.com',
      'news.ycombinator.com',
      'medium.com',
      'github.com'
    ];
    return domainsRequiringFullContent.some(domain => link.includes(domain));
  }

  private async extractBestImage(itemXml: string, itemLink: string): Promise<string | undefined> {
    try {
      const rssImage = this.extractImageFromRss(itemXml);
      if (rssImage) return this.normalizeUrl(rssImage, itemLink);

      const description = this.extractTag(itemXml, 'description') || '';
      const descImage = this.extractImageFromHtml(description, itemLink);
      if (descImage) return descImage;

      if (itemLink.includes('techcrunch.com')) {
        return this.handleTechCrunchImage(itemLink);
      }

      if (itemLink.includes('youtube.com') || itemLink.includes('youtu.be')) {
        return this.extractYoutubeThumbnail(itemLink);
      }

      if (this.fetchFullPage) {
        const html = await this.fetchArticleContent(itemLink);
        return this.extractMetaImage(html, itemLink) || 
               this.extractFirstContentImage(html, itemLink);
      }
    } catch (error) {
      console.error(`Image extraction failed for ${itemLink}:`, error);
    }
    return undefined;
  }

  private extractYoutubeThumbnail(url: string): string | undefined {
    try {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    } catch (error) {
      console.error('YouTube thumbnail extraction failed:', error);
    }
    return undefined;
  }

  private extractImageFromRss(xml: string): string | null {
    const patterns = [
      /<media:thumbnail[^>]+url="([^"]+)"/i,
      /<media:content[^>]+url="([^"]+)"[^>]+medium="image"/i,
      /<enclosure[^>]+url="([^"]+)"[^>]+type="image\//i,
      /<image[^>]*>\s*<url>([^<]+)/i,
      /<itunes:image[^>]+href="([^"]+)"/i
    ];

    for (const pattern of patterns) {
      const match = xml.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private async handleTechCrunchImage(articleUrl: string): Promise<string | undefined> {
    try {
      const html = await this.fetchArticleContent(articleUrl);
      const jsonLd = this.extractJsonLd(html);
      if (jsonLd?.image?.url) {
        return this.normalizeUrl(jsonLd.image.url, articleUrl);
      }

      const image = this.extractMetaImage(html, articleUrl) || 
                   this.extractFirstContentImage(html, articleUrl);
      return image;
    } catch (error) {
      console.error(`TechCrunch image fetch failed:`, error);
      return undefined;
    }
  }

  private extractMetaImage(html: string, baseUrl: string): string | undefined {
    const metaPatterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i
    ];

    for (const pattern of metaPatterns) {
      const match = html.match(pattern);
      if (match?.[1]) return this.normalizeUrl(match[1], baseUrl);
    }
    return undefined;
  }

  private extractFirstContentImage(html: string, baseUrl: string): string | undefined {
    const imgPattern = /<img[^>]+src=["']([^"']+)["']/i;
    const match = html.match(imgPattern);
    if (match?.[1] && this.isImageUrl(match[1])) {
      return this.normalizeUrl(match[1], baseUrl);
    }
    return undefined;
  }

  private extractImageFromHtml(html: string, baseUrl: string): string | undefined {
    return this.extractMetaImage(html, baseUrl) || 
           this.extractFirstContentImage(html, baseUrl);
  }

  private extractFirstValidLink(itemXml: string): string {
    const link = this.extractTag(itemXml, 'link')?.trim();
    const guid = this.extractTag(itemXml, 'guid')?.trim();
    
    if (link && this.isValidUrl(link)) return link;
    if (guid && this.isValidUrl(guid)) return guid;
    return link || guid || '';
  }

  private parseDate(itemXml: string): Date {
    const dateStr = this.extractTag(itemXml, 'pubDate') || 
                   this.extractTag(itemXml, 'published') || 
                   this.extractTag(itemXml, 'dc:date') ||
                   this.extractTag(itemXml, 'updated');
    return dateStr ? this.safeDateParse(dateStr) : new Date();
  }

  private safeDateParse(dateStr: string): Date {
    try {
      const date = new Date(dateStr.replace(/(\d{2}) (\w{3}) (\d{4})/, '$2 $1 $3'));
      return isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  }

  private extractCategories(itemXml: string): string[] {
    const categoryRegex = /<category[^>]*>([^<]+)<\/category>|<dc:subject>([^<]+)<\/dc:subject>/gi;
    const categories = new Set<string>();
    let categoryMatch;

    while ((categoryMatch = categoryRegex.exec(itemXml)) !== null) {
      const category = categoryMatch[1] || categoryMatch[2];
      if (category) categories.add(this.cleanText(category));
    }

    return Array.from(categories);
  }

  private isImageUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return this.imageExtensions.some(ext => 
        parsed.pathname.toLowerCase().endsWith(ext) ||
        parsed.pathname.toLowerCase().includes('.image') ||
        parsed.pathname.toLowerCase().includes('/images/')
      );
    } catch {
      return false;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private normalizeUrl(url: string, base?: string): string {
    if (!url || url.startsWith('data:')) return url;

    try {
      const normalized = new URL(url, base).toString()
        .split('?')[0]
        .split('#')[0]
        .replace(/\/+$/, '');
      return decodeURIComponent(normalized);
    } catch {
      return url;
    }
  }

  private extractTag(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? this.cleanText(match[1]) : null;
  }

  private cleanText(text: string): string {
    return text
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async fetchArticleContent(url: string): Promise<string> {
    const response = await fetch(url, { 
      headers: { 'User-Agent': this.userAgent },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  }

  public createArticleFromFeedItem(
    item: FeedItem,
    sourceId: number,
    sourceName: string,
    defaultCategory: string
  ): InsertArticle {
    // Специальная обработка для Hacker News
    let content = item.fullContent || item.description;
    if (item.link.includes('news.ycombinator.com') && content === item.link) {
      content = `Discussion link: ${item.link}`;
    }

    return {
      title: item.title.substring(0, 255),
      content,
      excerpt: this.extractExcerpt(content),
      url: item.link.substring(0, 512),
      imageUrl: item.image?.substring(0, 512) || null,
      category: (item.categories?.[0] || defaultCategory).substring(0, 100),
      sourceId,
      sourceName: sourceName.substring(0, 100),
      publishedAt: item.pubdate,
    };
  }

  private extractExcerpt(content: string, maxLength: number = 200): string {
    const text = this.cleanText(content);
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }
}
