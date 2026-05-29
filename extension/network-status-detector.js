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

function shouldTrackNetworkUrl(url) {
  if (!url || IGNORED_URL_PATTERNS.some((pattern) => pattern.test(url))) return false;
  return TRACKED_URL_PATTERNS.some((pattern) => pattern.test(url));
}

function classifyNetworkEvent(type) {
  if (type === 'start') return 'generating';
  if (type === 'finish' || type === 'abort') return 'complete';
  if (type === 'error') return 'error';
  return '';
}

if (typeof module !== 'undefined') {
  module.exports = {
    classifyNetworkEvent,
    shouldTrackNetworkUrl,
  };
}
