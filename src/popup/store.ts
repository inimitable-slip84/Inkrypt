import { create } from 'zustand';
import type { DecryptedEntry } from '../types/vault';

export type View =
  | 'loading'
  | 'signin'
  | 'signup'
  | 'signin-mfa'
  | 'unlock'
  | 'vault'
  | 'add'
  | 'settings';

type MfaSignin = { factorId: string; challengeId: string; email: string };

type AppState = {
  view: View;
  setView: (v: View) => void;
  mfaSignin: MfaSignin | null;
  setMfaSignin: (m: MfaSignin | null) => void;
  entries: DecryptedEntry[];
  setEntries: (e: DecryptedEntry[]) => void;
  /** When set, Add entry screen updates this row (e.g. missing ciphertext). */
  editingEntry: DecryptedEntry | null;
  setEditingEntry: (e: DecryptedEntry | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  view: 'loading',
  setView: (view) => set({ view }),
  mfaSignin: null,
  setMfaSignin: (mfaSignin) => set({ mfaSignin }),
  entries: [],
  setEntries: (entries) => set({ entries }),
  editingEntry: null,
  setEditingEntry: (editingEntry) => set({ editingEntry }),
}));
