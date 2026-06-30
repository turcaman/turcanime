import React, { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { sessionManager, webViewBridge } from "../../core/infrastructure";
import type { ISession } from "../../domain/interfaces";
import { logger } from "../../utils/logger";
import { GLOBAL_BOOTSTRAP } from "../webview/bootstrap";
import { ANIMELATINO_CONFIG } from "../../config/providerConfigs";

/** Extracts the first iframe src and posts it as EMBED_VIDEO_URL. */
const IFRAME_EXTRACT_FN = `(function(){
  try {
    var f = document.querySelector('iframe[src]');
    var msg = '[WebView] IFRAME_EXTRACT_FN: found iframe? ' + (!!f) + ' ' + (f && f.src);
    console.log(msg);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'LOG',data:msg}));
    }
    if (f && f.src && window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'EMBED_VIDEO_URL',
        data: f.src
      }));
    }
  } catch(e) {
    var errMsg = '[WebView] IFRAME_EXTRACT_FN error: ' + (e.message || e);
    console.log(errMsg);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'LOG',data:errMsg}));
    }
  }
})();`;

const WORKER_URL = ANIMELATINO_CONFIG.sessionWashUrl;

export const WebViewWorker = () => {
  const vRef = useRef<WebView>(null);

  useEffect(() => {
    webViewBridge.registerNavigation((uri: string) => {
      vRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(uri)};`);
    });
  }, []);

  const handleLoadEnd = useCallback(() => {
    webViewBridge.notifyPageLoaded();
    if (webViewBridge.hasPendingBridgeRequest()) {
      logger.info("WebViewWorker", "Injecting IFRAME_EXTRACT_FN");
      vRef.current?.injectJavaScript(IFRAME_EXTRACT_FN);
    }
  }, []);

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    const raw = e.nativeEvent.data;
    const result = webViewBridge.handleMessage(raw);

    if (result == null) return;

    if (result.type === "LOG") {
      logger.info("WebViewWorker", `[WebView Log] ${result.data}`);
      return;
    }

    if (result.type === "EMBED_VIDEO_URL") {
      const url = typeof result.data === "string" ? result.data : (result.data as Record<string, unknown>).url;
      if (typeof url === "string") {
        logger.info("WebViewWorker", `EMBED_VIDEO_URL: ${url.slice(0, 100)}`);
        webViewBridge.resolveBridge(url);
      }
      return;
    }

    if (result.type === "DECRYPTION_RESULT") {
      const data = result.data as Record<string, unknown>;
      if (typeof data.data === "string") {
        logger.info("WebViewWorker", `DECRYPTION_RESULT: ${(data.data as string).slice(0, 100)}`);
        webViewBridge.resolveBridge(data.data as string);
      }
      return;
    }

    if (result.type === "SESSION_UPDATE") {
      if (typeof result.data === "object" && "cookies" in result.data && "userAgent" in result.data) {
        void sessionManager.setSession(result.data as ISession);
      }
      return;
    }
  }, []);

  return (
    <View style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}>
      <WebView
        ref={vRef}
        source={{ uri: WORKER_URL }}
        injectedJavaScript={GLOBAL_BOOTSTRAP}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};
