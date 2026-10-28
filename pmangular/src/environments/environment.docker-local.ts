import { environment as developmentEnvironment } from './environment.development';

const localOrigin = window.location.origin;

export const environment = {
  ...developmentEnvironment,
  production: true,
  frontendUrl: localOrigin,
  apiUrl: `${localOrigin}/api`,
};
