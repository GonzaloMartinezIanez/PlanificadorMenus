import { vi } from 'vitest';

describe('Docker local environment', () => {
  it.each(['http://localhost:4200', 'http://127.0.0.1:4200'])(
    'keeps HTTP requests and invitation links on the browser origin %s',
    async (origin) => {
      vi.resetModules();
      vi.stubGlobal('window', { location: { origin } });
      let settings: typeof import('./environment.docker-local');
      try {
        settings = await import('./environment.docker-local');
      } finally {
        vi.unstubAllGlobals();
      }
      expect(settings.environment.frontendUrl).toBe(origin);
      expect(settings.environment.apiUrl).toBe(`${origin}/api`);
    },
  );
});
