import { useAppStore } from '../store';
import type { View } from '../store';

export default function AppMainHeader({ view }: { view: View }) {
  const entries = useAppStore((s) => s.entries);
  const editingEntry = useAppStore((s) => s.editingEntry);

  let title = 'Inkrypt';
  let sub: string | undefined;

  switch (view) {
    case 'loading':
      title = 'Inkrypt';
      sub = 'Loading…';
      break;
    case 'signin':
      title = 'Sign in';
      sub = 'Account';
      break;
    case 'signup':
      title = 'Create account';
      sub = 'New keyholder';
      break;
    case 'signin-mfa':
      title = 'Authenticator';
      sub = 'Second factor';
      break;
    case 'unlock':
      title = 'Unlock vault';
      sub = 'Master password';
      break;
    case 'vault':
      title = 'Vault';
      sub =
        entries.length === 0 ? 'No entries yet' : `${entries.length} saved ${entries.length === 1 ? 'login' : 'logins'}`;
      break;
    case 'add':
      if (!editingEntry) {
        title = 'Add entry';
        sub = 'New credentials';
      } else if (editingEntry.passwordMissing) {
        title = 'Complete entry';
        sub = editingEntry.site_url;
      } else {
        title = 'Edit entry';
        sub = editingEntry.site_url;
      }
      break;
    case 'settings':
      title = 'Settings';
      sub = 'Control room';
      break;
    default:
      break;
  }

  return (
    <header className="app-main__header shrink-0 border-b border-vault-border/80 bg-[var(--app-dashboard-bg)] px-4 py-3">
      {sub && (
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-vault-accent">{sub}</p>
      )}
      <h2 className="font-display text-xl font-semibold tracking-tight text-vault-text">{title}</h2>
    </header>
  );
}
