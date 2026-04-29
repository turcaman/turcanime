import { VideoServer } from "../../domain/entities";
import { log } from "../../utils/logger";
import { RscParser } from "../parsers/RscParser";

interface RawServerItem {
  id: string | number;
  server: { title: string };
  videoUrlEncrypted: string;
  languaje: string;
}

function mapLanguage(languaje: string): string {
  if (languaje === "1") return "LATINO";
  if (languaje === "2") return "CASTELLANO";
  return "SUB";
}

function createVideoServer(item: RawServerItem): VideoServer | null {
  if (!item?.server || item.server.title === "Gamma") return null;
  if (!item.videoUrlEncrypted) {
    log("createVideoServer", `Missing videoUrlEncrypted for server: ${item.server.title}`);
    return null;
  }

  return {
    id: item.id.toString(),
    title: item.server.title,
    url: item.videoUrlEncrypted.replace(/\\/g, "/"),
    language: mapLanguage(item.languaje),
  };
}

function parseRawServers(data: unknown[]): VideoServer[] {
  const servers: VideoServer[] = [];

  data.forEach((r: unknown) => {
    if (!Array.isArray(r)) return;
    r.forEach((item: unknown) => {
      const server = createVideoServer(item as RawServerItem);
      if (server) servers.push(server);
    });
  });

  return servers;
}

function extractRscDataFromScript(
  scriptText: string,
  rscParser: RscParser
): unknown[] | null {
  if (!scriptText.includes("self.__next_f.push")) return null;

  const payload = rscParser.parseRscPayload(scriptText);
  if (!payload || !payload.includes('"data":[[')) return null;

  const jsonStr = rscParser.extractJson(payload, '"data":', "[", "]");
  if (!jsonStr) return null;

  try {
    const data = JSON.parse(jsonStr);
    return Array.isArray(data) ? data : null;
  } catch (e: unknown) {
    log("extractRscDataFromScript", "JSON parse failed", e);
    return null;
  }
}

export function parseEpisodeServers(
  html: string,
  rscParser: RscParser,
  slug: string,
  number: string
): VideoServer[] {
  const scripts = html.matchAll(/<script[^>]*>(.*?)<\/script>/gs);
  const servers: VideoServer[] = [];

  for (const match of scripts) {
    const text = match[1];
    const data = extractRscDataFromScript(text, rscParser);

    if (data) {
      const newServers = parseRawServers(data);
      servers.push(...newServers);
    }
  }

  if (servers.length === 0) {
    log("parseEpisodeServers", `No servers extracted for ${slug} ep ${number}`);
  }

  return servers;
}
