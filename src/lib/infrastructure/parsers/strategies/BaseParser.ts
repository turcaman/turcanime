import { Anime } from "../../../domain/entities";
import { ParserUtils } from "../ParserUtils";
import { cleanTitle } from "../../../utils/text";

export abstract class BaseParser {
  protected createAnimeCard(url: string, image: string, title: string): Anime {
    return {
      title: cleanTitle(ParserUtils.sanitizeTitle(title)),
      image,
      url: ParserUtils.cleanUrl(url),
      status: "",
    };
  }

  protected extractContextAroundLink(html: string, linkIndex: number, radius: number): string {
    return html.substring(
      Math.max(0, linkIndex - radius),
      Math.min(html.length, linkIndex + radius)
    );
  }

  protected formatTitleFromUrl(url: string): string {
    return url
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  protected extractTitleFromAltAttribute(context: string): string | null {
    const altMatch = context.match(/alt="([^"]+)"/);
    return altMatch ? altMatch[1].trim() : null;
  }
}
