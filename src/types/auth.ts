import type { Session } from '@supabase/supabase-js';

export type AuthState =
  | { status: 'signed_out' }
  | { status: 'needs_mfa'; email: string; factorId: string; challengeId: string }
  | { status: 'signed_in'; session: Session; needsVaultUnlock: boolean };
