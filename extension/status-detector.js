function detectStatusFromSignals(signals) {
  if (signals.hasRecentResult) return signals.lastResultStatus || 'complete';
  if (signals.hasError) return 'error';
  if (signals.hasStop) return 'generating';
  if (signals.isTaskCandidate && signals.hasTextChangeRecently) return 'generating';
  if (signals.isTaskCandidate) return 'open';
  if (signals.hasTextChangeRecently) return 'open';
  if (!signals.hasOpened) return 'open';
  if (signals.hasUserActivity) return 'idle';
  return 'idle';
}

if (typeof module !== 'undefined') {
  module.exports = {
    detectStatusFromSignals,
  };
}
