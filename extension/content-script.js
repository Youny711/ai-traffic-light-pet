(function () {
  const LOCAL_ENDPOINT = 'http://127.0.0.1:4321/api/status';
  const NETWORK_CHANNEL = 'ai-traffic-pet-network-event';
  const provider = detectProvider(location.hostname);
  let lastStatus = '';
  let lastTextLength = 0;
  let lastTextChangeAt = Date.now();
  let lastSentAt = 0;
  let hasOpened = false;
  let hasUserActivity = false;
  let isTaskCandidate = false;
  let lastTaskCandidateAt = 0;
  let lastInputAt = 0;
  let activeNetworkRequests = 0;
  let generatingHeartbeatTimer = 0;
  let lastResultStatus = '';
  let lastResultAt = 0;

  if (!provider) return;

  const observer = new MutationObserver(scheduleDetect);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  scheduleDetect();
  setInterval(scheduleDetect, 1500);
  window.addEventListener('message', handleNetworkEvent);
  ['click', 'keydown', 'input', 'pointerdown', 'wheel'].forEach((eventName) => {
    window.addEventListener(eventName, markUserActivity, { capture: true, passive: true });
  });
  window.addEventListener('keydown', detectSubmitIntent, { capture: true });
  window.addEventListener('click', detectClickSubmitIntent, { capture: true });

  function scheduleDetect() {
    window.clearTimeout(scheduleDetect.timer);
    scheduleDetect.timer = window.setTimeout(detectAndSend, 250);
  }

  function detectAndSend() {
    const status = detectStatus();
    if (status === lastStatus && Date.now() - lastSentAt < 2500) return;
    lastStatus = status;
    sendStatus(status);
  }

  function detectStatus() {
    const pageText = document.body.innerText || '';
    const textLength = pageText.length;

    if (textLength !== lastTextLength) {
      lastTextLength = textLength;
      lastTextChangeAt = Date.now();
      if (Date.now() - lastInputAt < 120000) {
        isTaskCandidate = true;
        lastTaskCandidateAt = Date.now();
      }
    }

    const status = detectStatusFromSignals({
      hasOpened,
      hasUserActivity,
      isTaskCandidate: isTaskCandidate && Date.now() - lastTaskCandidateAt < 120000,
      hasRecentResult: lastResultStatus && Date.now() - lastResultAt < 10000,
      lastResultStatus,
      hasError: hasErrorSignal(pageText),
      hasStop: hasStopSignal(),
      hasTextChangeRecently: Date.now() - lastTextChangeAt < 2200,
    });

    hasOpened = true;
    if (status === 'open') {
      isTaskCandidate = false;
    }
    if (status === 'generating' || status === 'open') {
      hasUserActivity = false;
    }
    return status;
  }

  function markUserActivity() {
    hasUserActivity = true;
    scheduleDetect();
  }

  window.addEventListener('input', () => {
    lastInputAt = Date.now();
  }, { capture: true, passive: true });

  function detectSubmitIntent(event) {
    if ((event.key === 'Enter' && (event.metaKey || event.ctrlKey)) || (event.key === 'Enter' && !event.shiftKey)) {
      markTaskCandidate();
    }
  }

  function detectClickSubmitIntent(event) {
    const button = event.target && event.target.closest ? event.target.closest('button, [role="button"]') : null;
    if (!button) return;

    const label = [
      button.textContent,
      button.getAttribute('aria-label'),
      button.getAttribute('title'),
    ].filter(Boolean).join(' ');

    if ([
      'Send',
      '发送',
      'Submit',
      '提交',
      'ArrowUp',
      'send-button',
    ].some((text) => label.includes(text))) {
      markTaskCandidate();
    }
  }

  function markTaskCandidate() {
    isTaskCandidate = true;
    lastTaskCandidateAt = Date.now();
    hasUserActivity = false;
    scheduleDetect();
  }

  function hasStopSignal() {
    return findButtonText([
      'Stop generating',
      '停止生成',
      'Stop',
      '停止',
    ]);
  }

  function hasErrorSignal(pageText) {
    return [
      'Something went wrong',
      'There was an error',
      'Try again',
      '出了点问题',
      '发生错误',
      '重试',
    ].some((text) => pageText.includes(text));
  }

  function findButtonText(labels) {
    return Array.from(document.querySelectorAll('button, [role="button"]')).some((button) => {
      const label = [
        button.textContent,
        button.getAttribute('aria-label'),
        button.getAttribute('title'),
      ].filter(Boolean).join(' ');
      return labels.some((text) => label.includes(text));
    });
  }

  function sendStatus(status) {
    lastSentAt = Date.now();
    fetch(LOCAL_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider,
        status,
        title: getProviderTitle(provider),
      }),
    }).catch(() => {
      // 本地桌宠未启动时静默失败，避免打扰网页使用。
    });
  }

  function handleNetworkEvent(event) {
    if (event.source !== window || !event.data || event.data.source !== NETWORK_CHANNEL) return;

    const status = classifyNetworkEvent(event.data.type);
    if (!status) return;

    if (status === 'generating') {
      isTaskCandidate = true;
      lastTaskCandidateAt = Date.now();
      hasUserActivity = false;
      activeNetworkRequests += 1;
      startGeneratingHeartbeat();
    }
    if (status === 'complete' || status === 'error') {
      activeNetworkRequests = Math.max(0, activeNetworkRequests - 1);
      if (activeNetworkRequests === 0) stopGeneratingHeartbeat();
      lastResultStatus = status;
      lastResultAt = Date.now();
    }
    if (status === 'open' || status === 'complete') {
      isTaskCandidate = false;
      hasUserActivity = false;
    }

    lastStatus = status;
    sendStatus(status);
  }

  function startGeneratingHeartbeat() {
    if (generatingHeartbeatTimer) return;
    generatingHeartbeatTimer = window.setInterval(() => {
      if (activeNetworkRequests <= 0) {
        stopGeneratingHeartbeat();
        return;
      }
      sendStatus('generating');
    }, 3000);
  }

  function stopGeneratingHeartbeat() {
    window.clearInterval(generatingHeartbeatTimer);
    generatingHeartbeatTimer = 0;
  }

  function classifyNetworkEvent(type) {
    if (type === 'start') return 'generating';
    if (type === 'finish' || type === 'abort') return 'complete';
    if (type === 'error') return 'error';
    return '';
  }

  function detectProvider(hostname) {
    if (hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com')) return 'chatgpt';
    if (hostname.includes('gemini.google.com')) return 'gemini';
    if (hostname.includes('doubao.com')) return 'doubao';
    if (hostname.includes('deepseek.com')) return 'deepseek';
    return '';
  }

  function getProviderTitle(providerId) {
    return {
      chatgpt: 'ChatGPT',
      gemini: 'Gemini',
      doubao: '豆包',
      deepseek: 'DeepSeek',
    }[providerId] || providerId;
  }
})();
