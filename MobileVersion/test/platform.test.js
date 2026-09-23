import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { onAndroidBrowser } from '../src/platform.js';

const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const pretend = (userAgent, userAgentData) => Object.defineProperty(globalThis, 'navigator', { value: { userAgent, userAgentData }, configurable: true });

describe('who gets offered the Android app', () => {
  afterEach(() => original && Object.defineProperty(globalThis, 'navigator', original));

  test('Android phones in a browser: yes', () => {
    pretend('Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36');
    assert.equal(onAndroidBrowser(), true);
    pretend('Mozilla/5.0 (Linux; K) AppleWebKit/537.36 Chrome/140.0 Mobile Safari/537.36', { platform: 'Android' });
    assert.equal(onAndroidBrowser(), true);
  });

  test('PCs, Macs and iPhones: no, they just use the website', () => {
    pretend('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36');
    assert.equal(onAndroidBrowser(), false);
    pretend('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15');
    assert.equal(onAndroidBrowser(), false);
    pretend('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
    assert.equal(onAndroidBrowser(), false);
  });
});
