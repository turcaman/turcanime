export class ParserUtils {
  static sanitizeTitle(title: string): string {
    return title
      .replace(/&amp;/g, "&")
      .replace(/<[^>]*>/g, "")
      .trim();
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
}

