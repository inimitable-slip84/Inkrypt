import { useCallback, useEffect } from 'react';
import { sendMessage } from './api';
import { useAppStore } from './store';
import type { AuthState } from '../types/auth';
import AppSidebar, { phaseFromView } from './components/AppSidebar';
import AppMainHeader from './components/AppMainHeader';
import Signin from './pages/Signin';
import Signup from './pages/Signup';
import Unlock from './pages/Unlock';
import VaultList from './pages/VaultList';
import AddEntry from './pages/AddEntry';
import Settings from './pages/Settings';
import { POPUP_H, POPUP_W } from './popupDimensions';

function routeFromState(auth: AuthState, vaultUnlocked: boolean): void {
  const { setView, setMfaSignin } = useAppStore.getState();
  if (auth.status === 'signed_out') {
    setMfaSignin(null);
    setView('signin');
    return;
  }
  if (auth.status === 'needs_mfa') {
    setMfaSignin({
      factorId: auth.factorId,
      challengeId: auth.challengeId,
      email: auth.email,
    });
    setView('signin-mfa');
    return;
  }
  setMfaSignin(null);
  if (!vaultUnlocked) {
    setView('unlock');
    return;
  }
  setView('vault');
}

export default function App() {
  const view = useAppStore((s) => s.view);
  const setEntries = useAppStore((s) => s.setEntries);
  const setView = useAppStore((s) => s.setView);
  const setEditingEntry = useAppStore((s) => s.setEditingEntry);

  const refresh = useCallback(async () => {
    const state = await sendMessage<{ auth: AuthState; vaultUnlocked: boolean }>({
      type: 'GET_STATE',
    });
    routeFromState(state.auth, state.vaultUnlocked);
    if (state.auth.status === 'signed_in' && state.vaultUnlocked) {
      try {
        const entries = await sendMessage<import('../types/vault').DecryptedEntry[]>({
          type: 'LIST_VAULT',
        });
        setEntries(entries);
      } catch {
        setEntries([]);
      }
    }
  }, [setEntries]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => {
      void sendMessage({ type: 'PULSE_ACTIVITY' });
    }, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  const phase = phaseFromView(view);

  const mainBody = (
    <>
      {view === 'signin' && <Signin onSignedUp={() => setView('signup')} onRefresh={refresh} />}
      {view === 'signup' && <Signup onBack={() => setView('signin')} onRefresh={refresh} />}
      {view === 'signin-mfa' && <Signin onRefresh={refresh} mfaOnly />}
      {view === 'unlock' && <Unlock onUnlocked={refresh} onLogout={refresh} />}
      {view === 'vault' && (
        <VaultList
          onAdd={() => {
            setEditingEntry(null);
            setView('add');
          }}
          onRefresh={refresh}
        />
      )}
      {view === 'add' && (
        <AddEntry
          onBack={() => {
            setEditingEntry(null);
            setView('vault');
          }}
          onSaved={refresh}
        />
      )}
      {view === 'settings' && <Settings onRefresh={refresh} />}
    </>
  );

  if (view === 'loading') {
    return (
      <div className="vault-shell vault-shell--dashboard">
        <div
          className="vault-shell__inner flex min-h-0 min-w-0 flex-row items-stretch overflow-hidden shadow-vault"
          style={{ width: POPUP_W, height: POPUP_H }}
        >
          <AppSidebar phase="loading" view={view} onRefresh={refresh} />
          <div className="app-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--app-dashboard-bg)]">
            <AppMainHeader view={view} />
            <div className="app-main-scroll flex min-h-0 flex-1 flex-col items-center justify-center px-6">
              <div className="w-full min-w-0 text-center">
                <p className="text-sm text-vault-muted">Preparing your vault…</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vault-shell vault-shell--dashboard">
      <div
        className="vault-shell__inner flex min-h-0 min-w-0 flex-row items-stretch overflow-hidden shadow-vault"
        style={{ width: POPUP_W, height: POPUP_H }}
      >
        <AppSidebar phase={phase} view={view} onRefresh={refresh} />
        <div className="app-main flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--app-dashboard-bg)]">
          <AppMainHeader view={view} />
          <div className="app-main-scroll flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col">{mainBody}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
