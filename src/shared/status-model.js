const PROVIDERS = {
  CHATGPT: 'chatgpt',
  GEMINI: 'gemini',
  DOUBAO: 'doubao',
  DEEPSEEK: 'deepseek',
};

const PROVIDER_LABELS = {
  [PROVIDERS.CHATGPT]: 'ChatGPT',
  [PROVIDERS.GEMINI]: 'Gemini',
  [PROVIDERS.DOUBAO]: '豆包',
  [PROVIDERS.DEEPSEEK]: 'DeepSeek',
};

const PROVIDER_ORDER = [
  PROVIDERS.CHATGPT,
  PROVIDERS.GEMINI,
  PROVIDERS.DOUBAO,
  PROVIDERS.DEEPSEEK,
];

const SOURCE_STATUSES = {
  OPEN: 'open',
  IDLE: 'idle',
  GENERATING: 'generating',
  COMPLETE: 'complete',
  WAITING: 'waiting',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
};

const PET_STATES = {
  IDLE: 'idle',
  WORKING: 'working',
  COMPLETE: 'complete',
  WAITING: 'waiting',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
};

const STATUS_TO_PET_STATE = {
  [SOURCE_STATUSES.OPEN]: PET_STATES.IDLE,
  [SOURCE_STATUSES.IDLE]: PET_STATES.DISCONNECTED,
  [SOURCE_STATUSES.GENERATING]: PET_STATES.WORKING,
  [SOURCE_STATUSES.COMPLETE]: PET_STATES.COMPLETE,
  [SOURCE_STATUSES.WAITING]: PET_STATES.WAITING,
  [SOURCE_STATUSES.ERROR]: PET_STATES.ERROR,
  [SOURCE_STATUSES.DISCONNECTED]: PET_STATES.DISCONNECTED,
};

const STATUS_MESSAGES = {
  [SOURCE_STATUSES.OPEN]: '已打开',
  [SOURCE_STATUSES.IDLE]: '空闲未操作',
  [SOURCE_STATUSES.GENERATING]: '正在生成',
  [SOURCE_STATUSES.COMPLETE]: '已完成',
  [SOURCE_STATUSES.WAITING]: '等待你操作',
  [SOURCE_STATUSES.ERROR]: '出错了',
  [SOURCE_STATUSES.DISCONNECTED]: '未连接',
};

function normalizeStatusEvent(input) {
  if (!Object.values(PROVIDERS).includes(input.provider)) {
    throw new Error(`Unsupported provider: ${input.provider}`);
  }

  if (!Object.values(SOURCE_STATUSES).includes(input.status)) {
    throw new Error(`Unsupported status: ${input.status}`);
  }

  const title = input.title || PROVIDER_LABELS[input.provider];

  return {
    provider: input.provider,
    status: input.status,
    petState: STATUS_TO_PET_STATE[input.status],
    title,
    message: `${title} ${STATUS_MESSAGES[input.status]}`,
  };
}

function createStatusStore(options = {}) {
  const providerStates = new Map();
  const activeTtlMs = options.activeTtlMs || 8000;
  const openDisplayMs = options.openDisplayMs || 10000;
  const resultDisplayMs = options.resultDisplayMs || 10000;
  const now = options.now || Date.now;

  return {
    update(input) {
      const event = normalizeStatusEvent(input);
      const existing = providerStates.get(event.provider);
      if (
        existing &&
        [SOURCE_STATUSES.COMPLETE, SOURCE_STATUSES.ERROR].includes(existing.status) &&
        [SOURCE_STATUSES.IDLE, SOURCE_STATUSES.OPEN].includes(event.status) &&
        now() - existing.updatedAtMs <= resultDisplayMs
      ) {
        return this.getSnapshot();
      }

      providerStates.set(event.provider, {
        ...event,
        updatedAtMs: now(),
        updatedAt: new Date(now()).toISOString(),
      });
      return this.getSnapshot();
    },

    getProvider(provider) {
      return getProviderSnapshot(provider, providerStates.get(provider), activeTtlMs, openDisplayMs, resultDisplayMs, now());
    },

    getSnapshot() {
      const providers = PROVIDER_ORDER.map((provider) => (
        getProviderSnapshot(provider, providerStates.get(provider), activeTtlMs, openDisplayMs, resultDisplayMs, now())
      ));
      return {
        petState: getAggregatePetState(providers),
        providers,
      };
    },
  };
}

function getProviderSnapshot(provider, event, activeTtlMs, openDisplayMs, resultDisplayMs, currentTime) {
  const title = PROVIDER_LABELS[provider];

  if (!event || currentTime - event.updatedAtMs > activeTtlMs) {
    return {
      provider,
      status: SOURCE_STATUSES.DISCONNECTED,
      petState: PET_STATES.DISCONNECTED,
      title,
      message: `${title} 未打开`,
    };
  }

  if (event.status === SOURCE_STATUSES.OPEN && currentTime - event.updatedAtMs > openDisplayMs) {
    return {
      ...event,
      status: SOURCE_STATUSES.IDLE,
      petState: PET_STATES.DISCONNECTED,
      message: `${title} 空闲未操作`,
    };
  }

  if (
    [SOURCE_STATUSES.COMPLETE, SOURCE_STATUSES.ERROR].includes(event.status) &&
    currentTime - event.updatedAtMs > resultDisplayMs
  ) {
    return {
      ...event,
      status: SOURCE_STATUSES.IDLE,
      petState: PET_STATES.DISCONNECTED,
      message: `${title} 空闲未操作`,
    };
  }

  return event;
}

function getAggregatePetState(providers) {
  if (providers.length === 0) return PET_STATES.DISCONNECTED;

  const states = providers.map((provider) => provider.petState);
  if (states.includes(PET_STATES.ERROR)) return PET_STATES.ERROR;
  if (states.includes(PET_STATES.WORKING)) return PET_STATES.WORKING;
  if (states.includes(PET_STATES.WAITING)) return PET_STATES.WAITING;
  if (states.includes(PET_STATES.COMPLETE)) return PET_STATES.COMPLETE;
  if (states.includes(PET_STATES.IDLE)) return PET_STATES.IDLE;
  return PET_STATES.DISCONNECTED;
}

module.exports = {
  PROVIDERS,
  PROVIDER_ORDER,
  PROVIDER_LABELS,
  SOURCE_STATUSES,
  PET_STATES,
  normalizeStatusEvent,
  createStatusStore,
  getAggregatePetState,
};
