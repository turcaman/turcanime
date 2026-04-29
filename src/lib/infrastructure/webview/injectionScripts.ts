/**
 * JavaScript injection scripts used by WebViewBridge to extract
 * video URLs from loaded pages.
 *
 * Each function returns a string that evaluates to a boolean
 * (true for success with side-effect, false otherwise).
 */

/**
 * Injects JS that reads `jwplayerOptions.file` and `<source>` elements,
 * then posts the result as EMBED_VIDEO_URL message.
 * Used for simple extraction after navigation.
 */
export const JWPLAYER_EXTRACT_JS = `javascript:(function(){
  try {
    var f = (window.jwplayerOptions && window.jwplayerOptions.file) || '';
    if (f && f.indexOf('.mp4') !== -1) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'EMBED_VIDEO_URL',data:f}));
    }
    var sources = document.querySelectorAll('source[src]');
    for (var i = 0; i < sources.length; i++) {
      if (sources[i].src.indexOf('.mp4') !== -1) {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'EMBED_VIDEO_URL',data:sources[i].src}));
      }
    }
  } catch(e) {}
})();true;`;
