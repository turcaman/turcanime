import type { AnimeDetail } from "../../domain/entities";
import type { IHtmlParser, IRscParser } from "../../domain/interfaces";
import { cleanTitle } from "../../utils/text";

export class AnimeOrchestrator {
  constructor(private htmlParser: IHtmlParser, private rscParser: IRscParser) {}

  parseAnimeDetail(html: string, slug: string): AnimeDetail {
    const meta = this.htmlParser.extractMetaTags(html);
    const rscData = this.rscParser.parseAllFromScripts(html);

    const title = this.htmlParser.extractTitleFromHtml(html);
    const status = this.htmlParser.extractStatusFromHtml(html);
    const episodes = this.htmlParser.parseEpisodes(html, slug);

    const domSynopsis = this.htmlParser.extractSynopsisFromDom(html);

    const jsonLdSynopsis = this.htmlParser.extractSynopsisFromJsonLd(html);
    const jsonLdImage = this.htmlParser.extractImageFromJsonLd(html);
    const synopsis = rscData.synopsis ?? jsonLdSynopsis ?? domSynopsis ?? meta.description ?? "";

    const image = rscData.poster || (jsonLdImage ?? meta.banner ?? "");

    return {
      title: cleanTitle(title || (meta.title ?? "")),
      image,
      synopsis,
      banner: meta.banner ?? image,
      poster: image,
      status,
      genres: [],
      episodes,
      url: slug,
    };
  }
}
