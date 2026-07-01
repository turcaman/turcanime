import { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { SOURCE_CONFIG } from "../config/source";
import { GLOBAL_BOOTSTRAP } from "../services/bootstrap";
import { sessionManager } from "../services/session";
import { webViewBridge } from "../services/webview";
import { logger } from "../utils/logger";
import type { ISession } from "../types";

const WORKER_URL = SOURCE_CONFIG.sessionWashUrl;

export const WebViewWorker = () => {
  const vRef = useRef<WebView>(null);

  useEffect(() => {
    webViewBridge.registerNavigation((uri: string) => {
      vRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(uri)};`);
    });
  }, []);

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    const raw = e.nativeEvent.data;
    const result = webViewBridge.handleMessage(raw);
    if (result == null) return;

    if (result.type === "LOG") {
      logger.info("WebViewWorker", `[WebView Log] ${result.data}`);
      return;
    }

    if (result.type === "SESSION_UPDATE") {
      if (typeof result.data === "object" && result.data !== null && "cookies" in result.data && "userAgent" in result.data) {
        void sessionManager.setSession(result.data as ISession);
      }
      return;
    }
  }, []);

  return (
    <View style={{ width: 0, height: 0, position: "absolute", opacity: 0 }}>
      <WebView
        ref={vRef}
        source={{ uri: WORKER_URL }}
        injectedJavaScript={GLOBAL_BOOTSTRAP}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};
