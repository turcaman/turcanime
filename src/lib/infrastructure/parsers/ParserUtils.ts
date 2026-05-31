export class ParserUtils {
  static sanitizeTitle(title: string): string {
    return title
      .replace(/&amp;/g, "&")
      .replace(/<[^>]*>/g, "")
      .trim();
  }

  static extractWithRegex<T>(
    text: string,
    regex: RegExp,
    transformer: (match: RegExpMatchArray) => T | null
  ): (T | null)[] {
    const results: (T | null)[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      try {
        const data = transformer(match);
        results.push(data);
      } catch {
        results.push(null);
      }
    }

    return results;
  }

  static extractJsonField(text: string, key: string): string | null {
    const idx = text.indexOf(key);
    if (idx === -1) return null;

    const start = text.indexOf('"', idx + key.length);
    if (start === -1) return null;

    const end = text.indexOf('"', start + 1);
    if (end === -1) return null;

    return text.slice(start + 1, end);
  }

  static extractBetween(
    text: string,
    startChar: string,
    endChar: string,
    startIndex: number = 0
  ): string | null {
    const start = text.indexOf(startChar, startIndex);
    if (start === -1) return null;

    const end = text.indexOf(endChar, start + 1);
    if (end === -1) return null;

    return text.slice(start + 1, end);
  }

  static extractJson(text: string, key: string, sChar: string, eChar: string): string {
    const idx = text.indexOf(key);
    if (idx === -1) return "";
    const start = text.indexOf(sChar, idx + key.length);
    if (start === -1) return "";
    let depth = 1;
    let end = start + 1;
    while (depth > 0 && end < text.length) {
      if (text[end] === sChar) depth++;
      else if (text[end] === eChar) depth--;
      end++;
    }
    return text.slice(start, end);
  }

  static cleanUrl(url: string): string {
    return url.replace(/^\/+/, '').replace(/\/+$/, '');
  }

  static isValidUrl(url: string): boolean {
    return url.length > 0 && url.length < 500;
  }

  static extractImageUrl(context: string): string | null {
    const imgRegex = /(?:src|data-src)="([^"]+\.(?:jpg|jpeg|png|webp))"/i;
    const match = context.match(imgRegex);
    return match ? match[1]! : null;
  }
}
