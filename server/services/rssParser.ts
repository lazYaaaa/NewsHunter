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

  private previousItemsCache: { [link: string]: FeedItem } = {};
  private errorSet: Set<string> = new Set();

  async parseFeed(
    url: string,
    sourceId?: number,
    sourceName?: string
  ): Promise<{ items: FeedItem[]; warnings: string[] }> {
    const warnings: string[] = [];
    const items: FeedItem[] = [];
    try {
      const response = await this.fetchWithRedirects(url, warnings);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const xmlText = await response.text();

      const isAtom = /<feed[^>]*>/i.test(xmlText);
      const entries = await this.parseXML(xmlText, isAtom, warnings);

      for (const entry of entries) {
        if (entry.item) {
          items.push({ ...entry.item, sourceId, sourceName });
        }
      }
    } catch (e: any) {
      this.addWarning(warnings, `Не удалось разобрать RSS-ленту ${url}: ${e.message}`);
    }
    return { items, warnings };
  }

  private async fetchWithRedirects(
    url: string,
    warnings: string[],
    redirectCount = 0
  ): Promise<Response> {
    warnings ??= [];
    const response = await fetch(url, {
      headers: { 'User-Agent': this.userAgent },
      redirect: 'manual'
    });
    if (response.status >= 300 && response.status < 400 && redirectCount < this.maxRedirects) {
      const location = response.headers.get('location');
      if (location) {
        const newUrl = new URL(location, url).toString();
        this.addWarning(warnings, `Редирект с ${url} на ${newUrl}`);
        return this.fetchWithRedirects(newUrl, warnings, redirectCount + 1);
      }
    }
    return response;
  }

  private async parseXML(
    xmlText: string,
    isAtom: boolean,
    warnings?: string[]
  ): Promise<Array<{ item: FeedItem | null; warning?: string }>> {
    warnings ??= [];
    const results: Array<{ item: FeedItem | null; warning?: string }> = [];
    const regex = isAtom ? /<entry[^>]*>([\s\S]*?)<\/entry>/gi : /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = regex.exec(xmlText)) !== null) {
      try {
        const entryXml = match[1];
        const entryPosition = `(позиция в XML: ${match.index}-${match.index + match[0].length})`;

        const linkCandidate = this.extractFirstValidLink(entryXml, warnings);
        const link = linkCandidate || this.extractTag(entryXml, 'link', warnings) || '';

        if (!link) {
          const warningMsg = `Отсутствует URL в записи ${entryPosition}`;
          this.addWarning(warnings, warningMsg);
          results.push({ item: null, warning: warningMsg });
          continue;
        }

        if (!this.isValidUrl(link)) {
          const warningMsg = `Некорректный URL в записи: "${link.substring(0, 50)}..." ${entryPosition}`;
          this.addWarning(warnings, warningMsg);
          results.push({ item: null, warning: warningMsg });
          continue;
        }

        const isHackerNews = link.includes('hnrss.org') || 
                           this.extractTag(entryXml, 'link', warnings)?.includes('news.ycombinator');

        const title = this.extractTag(entryXml, 'title', warnings) || 'Без названия';

        let description = this.extractTag(entryXml, 'description', warnings) || 
                        this.extractTag(entryXml, 'content:encoded', warnings) || '';

        const pubdateStr = this.extractTag(entryXml, 'pubDate', warnings) || 
                         this.extractTag(entryXml, 'published', warnings) || '';
        const pubdate = pubdateStr ? this.safeDateParse(pubdateStr, warnings) : new Date();

        const categories = this.extractCategories(entryXml, warnings);

        const item: FeedItem = {
          title: this.cleanText(title),
          description: this.cleanText(description),
          link,
          pubdate,
          categories,
        };

        if (this.enableImageFetch) {
          try {
            item.image = await this.extractBestImage(entryXml, link, warnings);
          } catch (err) {
            this.addWarning(warnings, `Ошибка извлечения изображения для ${link}: ${(err as Error).message}`);
          }
        }

        if (this.fetchFullPage || this.needsFullContent(link)) {
          try {
            const { content, images } = await this.fetchAndParseArticle(link, warnings);
            item.fullContent = content;
            if (!item.image && images.length > 0) {
              item.image = images[0];
            }
          } catch (err) {
            this.addWarning(warnings, `Не удалось получить полный контент для ${link}: ${(err as Error).message}`);
          }
        }

        this.previousItemsCache[link] = item;
        results.push({ item });
      } catch (err: any) {
        const errorMsg = `Ошибка обработки записи: ${(err as Error).message}`;
        this.addWarning(warnings, errorMsg);
        results.push({ item: null, warning: errorMsg });
      }
    }
    return results;
  }

  private async fetchAndParseArticle(url: string, warnings?: string[]): Promise<{ content: string; images: string[] }> {
    warnings ??= [];
    try {
      const html = await this.fetchArticleContent(url, warnings);
      if (url.includes('techcrunch.com')) {
        const jsonLd = this.extractJsonLd(html, warnings);
        if (jsonLd?.image?.url) {
          return {
            content: jsonLd.articleBody || '',
            images: jsonLd.image ? [jsonLd.image.url] : []
          };
        }
      }
      return {
        content: this.extractMainContent(html, warnings),
        images: this.extractAllImages(html, url, warnings)
      };
    } catch (err) {
      throw err;
    }
  }

  private extractJsonLd(html: string, warnings: string[]): any | null {
    warnings ??= [];
    const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i;
    const match = html.match(scriptRegex);
    if (!match) return null;
    try {
      const json = JSON.parse(match[1]);
      if (json['@graph']) {
        const article = json['@graph'].find((item: any) => item['@type'] === 'Article');
        return article || null;
      }
      return json;
    } catch (e) {
      this.addWarning(warnings, 'Ошибка разбора JSON-LD: ' + e);
      return null;
    }
  }

  private extractMainContent(html: string, warnings: string[]): string {
    warnings ??= [];
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!bodyMatch) return html;

    const body = bodyMatch[1];

    const articleMatch = body.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) return articleMatch[1];

    const divMatch = body.match(/<div[^>]+class=["'][^"']*(article|main|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (divMatch) return divMatch[2];

    return body;
  }

  private extractAllImages(html: string, baseUrl: string, warnings: string[]): string[] {
    warnings ??= [];
    const images = new Set<string>();
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const url = this.normalizeUrl(match[1], baseUrl);
      if (this.isImageUrl(url)) {
        images.add(url);
      }
    }
    const metaImage = this.extractMetaImage(html, baseUrl, warnings);
    if (metaImage) images.add(metaImage);
    return Array.from(images);
  }

  private needsFullContent(link: string): boolean {
    const domains = ['techcrunch.com', 'news.ycombinator.com', 'medium.com', 'github.com'];
    return domains.some(domain => link.includes(domain));
  }

  private async extractBestImage(entryXml: string, link: string, warnings?: string[]): Promise<string | undefined> {
    warnings ??= [];
    try {
      const rssImage = this.extractImageFromRss(entryXml, warnings);
      if (rssImage) return this.normalizeUrl(rssImage, link);

      const description = this.extractTag(entryXml, 'description', warnings) || '';
      const descImage = this.extractImageFromHtml(description, link, warnings);
      if (descImage) return descImage;

      if (link.includes('techcrunch.com')) {
        return this.handleTechCrunchImage(link, warnings);
      }

      if (link.includes('youtube.com') || link.includes('youtu.be')) {
        return this.extractYoutubeThumbnail(link);
      }

      if (this.fetchFullPage) {
        try {
          const html = await this.fetchArticleContent(link, warnings);
          return this.extractMetaImage(html, link, warnings) || this.extractFirstContentImage(html, link, warnings);
        } catch (err) {
          this.addWarning(warnings, `Ошибка загрузки страницы для извлечения изображения из ${link}: ${(err as Error).message}`);
        }
      }
    } catch (e) {
      this.addWarning(warnings, `Сбой извлечения изображения для ${link}: ${(e as Error).message}`);
    }
    return undefined;
  }

  private extractYoutubeThumbnail(url: string): string | undefined {
    try {
      const idMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (idMatch && idMatch[1]) {
        return `https://img.youtube.com/vi/${idMatch[1]}/maxresdefault.jpg`;
      }
    } catch (e) {
      return undefined;
    }
    return undefined;
  }

  private extractImageFromRss(xml: string, warnings: string[]): string | null {
    warnings ??= [];
    const patterns = [
      /<media:thumbnail[^>]+url=["']([^"']+)["']/i,
      /<media:content[^>]+url=["']([^"']+)["'][^>]*medium=["']image["']/i,
      /<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\//i,
      /<image[^>]*>\s*<url>([^<]+)<\/url>/i,
      /<itunes:image[^>]+href=["']([^"']+)["']/i
    ];
    for (const pattern of patterns) {
      const match = xml.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private async handleTechCrunchImage(link: string, warnings?: string[]): Promise<string | undefined> {
    warnings ??= [];
    try {
      const html = await this.fetchArticleContent(link, warnings);
      const jsonLd = this.extractJsonLd(html, warnings);
      if (jsonLd?.image?.url) {
        return this.normalizeUrl(jsonLd.image.url, link);
      }
      const metaImage = this.extractMetaImage(html, link, warnings);
      if (metaImage) return metaImage;
      return this.extractFirstContentImage(html, link, warnings);
    } catch (e) {
      this.addWarning(warnings, `Ошибка получения изображения из TechCrunch: ${(e as Error).message}`);
      return undefined;
    }
  }

  private extractMetaImage(html: string, baseUrl: string, warnings: string[]): string | undefined {
    warnings ??= [];
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

  private extractFirstContentImage(html: string, baseUrl: string, warnings: string[]): string | undefined {
    warnings ??= [];
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match?.[1] && this.isImageUrl(match[1])) {
      return this.normalizeUrl(match[1], baseUrl);
    }
    return undefined;
  }

  private extractImageFromHtml(html: string, baseUrl: string, warnings: string[]): string | undefined {
    return this.extractMetaImage(html, baseUrl, warnings) || this.extractFirstContentImage(html, baseUrl, warnings);
  }

  private extractFirstValidLink(entryXml: string, warnings?: string[]): string {
    warnings ??= [];
    const linkCandidates = [
      this.extractTag(entryXml, 'link', warnings),
      this.extractTag(entryXml, 'guid', warnings),
      this.extractTag(entryXml, 'id', warnings)
    ];

    for (const candidate of linkCandidates) {
      if (candidate && this.isValidUrl(candidate.trim())) {
        return candidate.trim();
      }
    }
    return '';
  }

  private parseDate(entryXml: string, warnings?: string[]): Date {
    warnings ??= [];
    const dateStr = this.extractTag(entryXml, 'pubDate', warnings) ||
                    this.extractTag(entryXml, 'published', warnings) ||
                    this.extractTag(entryXml, 'dc:date', warnings) ||
                    this.extractTag(entryXml, 'updated', warnings) ||
                    '';
    return dateStr ? this.safeDateParse(dateStr, warnings) : new Date();
  }

  private safeDateParse(dateStr: string, warnings?: string[]): Date {
    warnings ??= [];
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      this.addWarning(warnings, 'Некорректный формат даты: ' + dateStr);
      return new Date();
    }
    return date;
  }

  private extractCategories(entryXml: string, warnings?: string[]): string[] {
    warnings ??= [];
    const categories: Set<string> = new Set();
    const regexes = [
      /<category[^>]*>([^<]+)<\/category>/gi,
      /<dc:subject[^>]*>([^<]+)<\/dc:subject>/gi
    ];
    for (const regex of regexes) {
      let match;
      while ((match = regex.exec(entryXml)) !== null) {
        categories.add(this.cleanText(match[1]));
      }
    }
    return Array.from(categories);
  }

  private isImageUrl(url: string): boolean {
    try {
      const parsed = new URL(url, 'http://dummy');
      return this.imageExtensions.some(ext => parsed.pathname.toLowerCase().endsWith(ext));
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

  private extractTag(xml: string, tagName: string, warnings?: string[]): string | null {
    warnings ??= [];
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

  private async fetchArticleContent(url: string, warnings?: string[]): Promise<string> {
    warnings ??= [];
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (e) {
      this.addWarning(warnings, `Ошибка загрузки ${url}: ${(e as Error).message}`);
      throw e;
    }
  }

  public createArticleFromFeedItem(
    item: FeedItem,
    sourceId: number,
    sourceName: string,
    defaultCategory: string
  ): InsertArticle {
    let content = item.fullContent || item.description;
    if (item.link.includes('news.ycombinator.com') && content === item.link) {
      content = `Ссылка на обсуждение: ${item.link}`;
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

  private addWarning(warnings: string[] | undefined, message: string) {
    if (!warnings) return;
    if (!this.errorSet.has(message)) {
      warnings.push(message);
      this.errorSet.add(message);
    }
  }
}
