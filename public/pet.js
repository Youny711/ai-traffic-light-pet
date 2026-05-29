const petStrip = document.querySelector('#petStrip');

const PROVIDERS = [
  {
    id: 'chatgpt',
    title: 'ChatGPT',
    logo: '/assets/logos/chatgpt.svg',
    accent: '#10a37f',
    url: 'https://chatgpt.com/',
  },
  {
    id: 'gemini',
    title: 'Gemini',
    logo: '/assets/logos/gemini.svg',
    accent: '#8ab4f8',
    url: 'https://gemini.google.com/',
  },
  {
    id: 'doubao',
    title: '豆包',
    logo: '/assets/logos/doubao.png',
    accent: '#7c6cff',
    url: 'https://www.doubao.com/',
  },
  {
    id: 'deepseek',
    title: 'DeepSeek',
    logo: '/assets/logos/deepseek.svg',
    accent: '#4f8cff',
    url: 'https://chat.deepseek.com/',
  },
];

const STATE_TITLES = {
  idle: '已打开',
  working: '正在生成',
  complete: '生成完成',
  waiting: '等待你操作',
  error: '出错',
  disconnected: '未打开',
};

function buildLights() {
  petStrip.replaceChildren(...PROVIDERS.map((provider) => {
    const light = document.createElement('section');
    light.className = 'ai-light';
    light.dataset.provider = provider.id;
    light.dataset.state = 'disconnected';
    light.style.setProperty('--provider-accent', provider.accent);
    light.setAttribute('aria-label', `${provider.title} 未打开`);
    light.setAttribute('role', 'button');
    light.setAttribute('tabindex', '0');
    light.setAttribute('title', `打开 ${provider.title}`);
    light.addEventListener('click', () => openProvider(provider));
    light.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openProvider(provider);
      }
    });

    const logo = document.createElement('img');
    logo.className = 'ai-logo';
    logo.src = provider.logo;
    logo.alt = provider.title;
    logo.draggable = false;

    light.append(logo);
    return light;
  }));
}

function openProvider(provider) {
  window.open(provider.url, '_blank', 'noopener,noreferrer');
}

async function refreshStatus() {
  try {
    const response = await fetch('/api/status');
    renderSnapshot(await response.json());
  } catch {
    renderSnapshot({
      providers: PROVIDERS.map((provider) => ({
        provider: provider.id,
        petState: 'disconnected',
      })),
    });
  }
}

function renderSnapshot(snapshot) {
  const stateByProvider = new Map(snapshot.providers.map((provider) => [provider.provider, provider]));

  for (const provider of PROVIDERS) {
    const data = stateByProvider.get(provider.id) || { petState: 'disconnected' };
    const light = petStrip.querySelector(`[data-provider="${provider.id}"]`);
    light.dataset.state = data.petState;
    light.dataset.status = data.status || 'disconnected';
    light.setAttribute('aria-label', `${provider.title} ${STATE_TITLES[data.petState] || '未知状态'}`);
  }
}

buildLights();
refreshStatus();
setInterval(refreshStatus, 900);
