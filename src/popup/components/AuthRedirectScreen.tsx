import MainLogo from './MainLogo';
import AppVersion from './AppVersion';
import ThemeToggle from './ThemeToggle';
import type { AuthUrlResult } from '../authFromUrl';

type Props = {
  result: Extract<AuthUrlResult, { kind: 'ok' | 'error' }>;
};

export default function AuthRedirectScreen({ result }: Props) {
  const ok = result.kind === 'ok';
  return (
    <div className="vault-shell vault-shell--dashboard">
      <div className="absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-2">
        <AppVersion />
        <ThemeToggle />
      </div>
      <div
        className="vault-shell__inner flex flex-col px-8 pb-8 pt-16"
        style={{ width: 818, height: 728 }}
      >
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <MainLogo />
          <p className="vault-eyebrow mt-6">Inkrypt</p>
          <h1 className="vault-mark mt-1">{ok ? 'OK' : 'Something went wrong'}</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-vault-muted">
            {ok
              ? 'Your email is confirmed and you’re signed in. Close this tab and open Inkrypt from the toolbar when you’re ready.'
              : result.message}
          </p>
        </div>
      </div>
    </div>
  );
}
