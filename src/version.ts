const semver = (import.meta.env.VITE_APP_VERSION as string) || '0.0.0';

function shortLabel(version: string): string {
  const [major = '0', minor = '0'] = version.split('.');
  return `v${major}.${minor}`;
}

export const APP_NAME = 'Inkrypt';
export const VERSION_LABEL = `${shortLabel(semver)} ${APP_NAME}`;
