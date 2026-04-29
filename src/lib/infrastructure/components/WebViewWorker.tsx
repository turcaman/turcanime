import React, { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { sessionManager, webViewBridge } from "../../core/infrastructure";
import { ISession } from "../../domain/interfaces";
import { GLOBAL_BOOTSTRAP } from "../webview/bootstrap";

// TODO: Make this provider-agnostic - inject worker URL from provider config
const WORKER_URL = "https://www.animelatinohd.com/";

/**
 * Headless component that runs in the background to handle:
 * 1. Session capture (Cookies/User-Agent).
 * 2. Crypto operations (AES-GCM decryption).
 */
export const WebViewWorker = () => {
  const vRef = useRef<WebView>(null);

  // Register navigation and injection capabilities so WebViewBridge can trigger decryption
  useEffect(() => {
    webViewBridge.registerNavigation((uri: string) => {
      vRef.current?.injectJavaScript(`window.location.href = ${JSON.stringify(uri)};`);
    });

    webViewBridge.registerInjection((code: string) => {
      vRef.current?.injectJavaScript(code);
    });
  }, []);

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    const raw = e.nativeEvent.data;
    const result = webViewBridge.handleMessage(raw);

    if (result?.type === "SESSION_UPDATE") {
      if (typeof result.data === "object" && "cookies" in result.data && "userAgent" in result.data) {
        sessionManager.setSession(result.data as ISession);
      }
    }
  }, []);

  return (
    <View style={{ width: 0, height: 0, position: 'absolute', opacity: 0 }}>
      <WebView
        ref={vRef}
        source={{ uri: WORKER_URL }}
        injectedJavaScript={GLOBAL_BOOTSTRAP}
        onMessage={handleMessage}
        onLoadEnd={() => webViewBridge.notifyPageLoaded()}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </View>
  );
};
