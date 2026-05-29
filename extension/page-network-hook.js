(function () {
  const CHANNEL = 'ai-traffic-pet-network-event';

  const TRACKED_URL_PATTERNS = [
    /backend-api\/conversation/i,
    /conversation/i,
    /completion/i,
    /generate/i,
    /stream/i,
    /BardFrontendService/i,
    /StreamGenerate/i,
    /chat/i,
  ];

  const IGNORED_URL_PATTERNS = [
    /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?|ttf)(?:\?|$)/i,
    /monitor_browser/i,
    /collect\/batch/i,
    /analytics/i,
    /telemetry/i,
    /log/i,
  ];

  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  if (window.__aiTrafficPetNetworkHookInstalled) return;
  window.__aiTrafficPetNetworkHookInstalled = true;

  window.fetch = async function hookedFetch(input, init) {
    const url = getFetchUrl(input);
    const shouldTrack = shouldTrackNetworkUrl(url);
    if (shouldTrack) postNetworkEvent('start', url);

    try {
      const response = await originalFetch.apply(this, arguments);
      if (!shouldTrack || !response.body) {
        if (shouldTrack) postNetworkEvent(response.ok ? 'finish' : 'error', url);
        return response;
      }

      const reader = response.body.getReader();
      const stream = new ReadableStream({
        start(controller) {
          pump();

          function pump() {
            reader.read().then(({ done, value }) => {
              if (done) {
                postNetworkEvent(response.ok ? 'finish' : 'error', url);
                controller.close();
                return;
              }
              controller.enqueue(value);
              pump();
            }).catch((error) => {
              postNetworkEvent(error && error.name === 'AbortError' ? 'abort' : 'error', url);
              controller.error(error);
            });
          }
        },
        cancel(reason) {
          postNetworkEvent('abort', url);
          return reader.cancel(reason);
        },
      });

      return new Response(stream, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      });
    } catch (error) {
      if (shouldTrack) postNetworkEvent(error && error.name === 'AbortError' ? 'abort' : 'error', url);
      throw error;
    }
  };

  XMLHttpRequest.prototype.open = function hookedOpen(method, url) {
    this.__aiTrafficPetUrl = String(url || '');
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function hookedSend() {
    const url = this.__aiTrafficPetUrl || '';
    if (shouldTrackNetworkUrl(url)) {
      postNetworkEvent('start', url);
      this.addEventListener('loadend', () => {
        postNetworkEvent(this.status >= 200 && this.status < 500 ? 'finish' : 'error', url);
      }, { once: true });
      this.addEventListener('error', () => postNetworkEvent('error', url), { once: true });
      this.addEventListener('abort', () => postNetworkEvent('abort', url), { once: true });
    }
    return originalSend.apply(this, arguments);
  };

  function getFetchUrl(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function shouldTrackNetworkUrl(url) {
    if (!url || IGNORED_URL_PATTERNS.some((pattern) => pattern.test(url))) return false;
    return TRACKED_URL_PATTERNS.some((pattern) => pattern.test(url));
  }

  function postNetworkEvent(type, url) {
    window.postMessage({
      source: CHANNEL,
      type,
      url,
      at: Date.now(),
    }, '*');
  }
})();
