import { HLS_EXTRACT_JS, IFRAME_EXTRACT_JS } from "../../webview/injectionScripts";

export class InjectionService {
  getIframeExtractJs(): string {
    return IFRAME_EXTRACT_JS;
  }
  
  getHlsExtractJs(): string {
    return HLS_EXTRACT_JS;
  }
}
