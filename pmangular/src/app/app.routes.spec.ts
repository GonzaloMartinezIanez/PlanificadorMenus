import { Recipes } from './components/recipes/recipes';
import { routes } from './app.routes';
import { Landing } from './core/landing/landing';
import { Layout } from './core/layout/layout';

describe('routes', () => {
  it('shows the public landing page at the root route', () => {
    const layoutRoute = routes.find((route) => route.component === Layout);
    const landingRoute = layoutRoute?.children?.find((route) => route.path === '');

    expect(landingRoute?.component).toBe(Landing);
    expect(landingRoute?.pathMatch).toBe('full');
  });

  it('redirects the old login address to the landing page', () => {
    const loginRoute = routes.find((route) => route.path === 'login');

    expect(loginRoute?.redirectTo).toBe('');
    expect(loginRoute?.pathMatch).toBe('full');
  });

  it('keeps the public recipe repository accessible without an authentication guard', () => {
    const layoutRoute = routes.find((route) => route.component === Layout);
    const recipesRoute = layoutRoute?.children?.find((route) => route.component === Recipes);

    expect(recipesRoute?.path).toBe('recipes');
    expect(recipesRoute?.canActivate).toBeUndefined();
  });
});
