import { TestBed } from '@angular/core/testing';
import { afterEach, vi } from 'vitest';
import { GoogleCredentialResponse, GoogleIdentityApi } from '../models/google-identity';
import { GoogleIdentityService } from './google-identity.service';

const scriptSelector = 'script[src="https://accounts.google.com/gsi/client"]';

describe('GoogleIdentityService', () => {
  let service: GoogleIdentityService;
  let callback: (response: GoogleCredentialResponse) => void;
  let api: GoogleIdentityApi;

  beforeEach(() => {
    delete window.google;
    document.querySelector(scriptSelector)?.remove();
    TestBed.configureTestingModule({});
    service = TestBed.inject(GoogleIdentityService);
    api = {
      initialize: vi.fn((config) => {
        callback = config.callback;
      }),
      renderButton: vi.fn(),
    };
  });

  afterEach(() => {
    delete window.google;
    document.querySelector(scriptSelector)?.remove();
    vi.useRealTimers();
  });

  it('shares one pending script download between callers', async () => {
    const first = service.load();
    const second = service.load();
    expect(first).toBe(second);
    expect(document.querySelectorAll(scriptSelector)).toHaveLength(1);
    window.google = { accounts: { id: api } };
    document.querySelector(scriptSelector)!.dispatchEvent(new Event('load'));
    await Promise.all([first, second]);
  });

  it('reuses a script already present in the document', async () => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    document.head.appendChild(script);
    const loaded = service.load();
    window.google = { accounts: { id: api } };
    script.dispatchEvent(new Event('load'));
    await loaded;
    expect(document.querySelectorAll(scriptSelector)).toHaveLength(1);
  });

  it('allows a new attempt after a script download fails', async () => {
    const loaded = service.load();
    const failure = expect(loaded).rejects.toThrow('no se pudo cargar');
    document.querySelector(scriptSelector)!.dispatchEvent(new Event('error'));
    await failure;
    expect(document.querySelector(scriptSelector)).toBeNull();
    const retry = service.load();
    window.google = { accounts: { id: api } };
    document.querySelector(scriptSelector)!.dispatchEvent(new Event('load'));
    await retry;
  });

  it('times out and releases polling timers if Google never becomes available', async () => {
    vi.useFakeTimers();
    const loaded = service.load();
    const failure = expect(loaded).rejects.toThrow('no está disponible');
    await vi.advanceTimersByTimeAsync(5000);
    await failure;
    expect(vi.getTimerCount()).toBe(0);
    expect(document.querySelector(scriptSelector)).toBeNull();
  });

  it('initializes Google once and routes credentials to the current screen', () => {
    window.google = { accounts: { id: api } };
    const previous = vi.fn(),
      current = vi.fn();
    const disconnectPrevious = service.renderButton(document.createElement('div'), previous);
    const disconnectCurrent = service.renderButton(document.createElement('div'), current);
    disconnectPrevious();
    callback({ credential: 'example-token' });
    expect(api.initialize).toHaveBeenCalledTimes(1);
    expect(previous).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledWith({ credential: 'example-token' });
    disconnectCurrent();
    callback({ credential: 'ignored-token' });
    expect(current).toHaveBeenCalledTimes(1);
  });
});
