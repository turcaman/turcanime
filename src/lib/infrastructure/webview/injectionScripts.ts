/**
 * Extracts the src attribute of the first iframe on the page
 * and posts it as EMBED_VIDEO_URL message.
 * Used via injectJavaScript after WebView navigates to a bridge URL.
 */
export const IFRAME_EXTRACT_FN = `(function(){
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


