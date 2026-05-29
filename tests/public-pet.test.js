const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

function createElement(tagName) {
  const listeners = new Map();

  return {
    tagName,
    children: [],
    dataset: {},
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = value;
      },
    },
    className: '',
    attributes: {},
    draggable: true,
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    append(...children) {
      this.children.push(...children);
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    dispatchEvent(type) {
      const listener = listeners.get(type);
      if (listener) listener({ currentTarget: this });
    },
  };
}

test('clicking each AI light opens the matching AI website', async () => {
  const petStrip = {
    children: [],
    replaceChildren(...children) {
      this.children = children;
    },
    querySelector(selector) {
      const match = selector.match(/data-provider="([^"]+)"/);
      return this.children.find((child) => child.dataset.provider === match[1]);
    },
  };
  const openCalls = [];
  const scriptPath = path.join(__dirname, '..', 'public', 'pet.js');
  const script = fs.readFileSync(scriptPath, 'utf8');

  vm.runInNewContext(script, {
    document: {
      querySelector(selector) {
        assert.equal(selector, '#petStrip');
        return petStrip;
      },
      createElement,
    },
    fetch: async () => ({
      json: async () => ({ providers: [] }),
    }),
    setInterval() {},
    window: {
      open(url, target, features) {
        openCalls.push({ url, target, features });
        return {};
      },
    },
  });

  assert.equal(petStrip.children.length, 4);

  for (const light of petStrip.children) {
    light.dispatchEvent('click');
  }

  assert.deepEqual(openCalls, [
    { url: 'https://chatgpt.com/', target: '_blank', features: 'noopener,noreferrer' },
    { url: 'https://gemini.google.com/', target: '_blank', features: 'noopener,noreferrer' },
    { url: 'https://www.doubao.com/', target: '_blank', features: 'noopener,noreferrer' },
    { url: 'https://chat.deepseek.com/', target: '_blank', features: 'noopener,noreferrer' },
  ]);
});

test('clicking an AI light keeps the pet page open when popup is blocked', () => {
  const petStrip = {
    children: [],
    replaceChildren(...children) {
      this.children = children;
    },
    querySelector(selector) {
      const match = selector.match(/data-provider="([^"]+)"/);
      return this.children.find((child) => child.dataset.provider === match[1]);
    },
  };
  const location = { href: 'http://127.0.0.1:4321/' };
  const scriptPath = path.join(__dirname, '..', 'public', 'pet.js');
  const script = fs.readFileSync(scriptPath, 'utf8');

  vm.runInNewContext(script, {
    document: {
      querySelector(selector) {
        assert.equal(selector, '#petStrip');
        return petStrip;
      },
      createElement,
    },
    fetch: async () => ({
      json: async () => ({ providers: [] }),
    }),
    setInterval() {},
    window: {
      location,
      open() {
        return null;
      },
    },
  });

  petStrip.children[0].dispatchEvent('click');

  assert.equal(location.href, 'http://127.0.0.1:4321/');
});
