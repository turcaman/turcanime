/**
 * Extracts the src attribute of the first iframe on the page
 * and posts it as EMBED_VIDEO_URL message.
 * Used for stream wrapper pages that embed the actual player.
 */
export const IFRAME_EXTRACT_JS = `javascript:(function(){
  try {
    var iframe = document.querySelector('iframe[src]');
    if (iframe && iframe.src) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'EMBED_VIDEO_URL',data:iframe.src}));
    }
  } catch(e) {}
})();true;`;

/**
 * Extracts HLS (.m3u8) or MP4 video URLs from the DOM.
 * Searches <video src>, <source src>, and hls.js instances.
 * Used for embed player pages (SPA-based).
 */
export const HLS_EXTRACT_JS = `javascript:(function(){
  try {
    var src = '';
    var video = document.querySelector('video');
    if (video) {
      src = video.src || (video.querySelector && video.querySelector('source[src*=".m3u8"]')?.src) || '';
    }
    if (!src) {
      var source = document.querySelector('source[src]');
      if (source) src = source.src;
    }
    if (!src && window.Hls) {
      try {
        var instances = Hls.instances || (Hls.isSupported() && Hls.prototype.url) || '';
        if (typeof instances === 'string') src = instances;
      } catch(e) {}
    }
    if (src && (src.indexOf('.m3u8') !== -1 || src.indexOf('.mp4') !== -1)) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:'EMBED_VIDEO_URL',data:src}));
    }
  } catch(e) {}
})();true;`;
