import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthState } from '../types/auth';
import { getSupabaseClient } from '../utils/supabase';

let supabase: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!supabase) supabase = getSupabaseClient();
  return supabase;
}

export type { AuthState } from '../types/auth';

let pendingMfa: { email: string; factorId: string; challengeId: string } | null = null;

export function getPendingMfa() {
  return pendingMfa;
}

export function clearPendingMfa() {
  pendingMfa = null;
}

export async function loadSession(): Promise<AuthState> {
  const client = getClient();
  const { data } = await client.auth.getSession();
  const session = data.session;
  if (!session?.user) return { status: 'signed_out' };

  const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
    const factors = await client.auth.mfa.listFactors();
    const totp =
      factors.data?.totp?.find((f) => f.status === 'verified') ?? factors.data?.totp?.[0];
    if (!totp) return { status: 'signed_out' };
    const { data: ch, error } = await client.auth.mfa.challenge({ factorId: totp.id });
    if (error || !ch) return { status: 'signed_out' };
    pendingMfa = {
      email: session.user.email ?? '',
      factorId: totp.id,
      challengeId: ch.id,
    };
    return {
      status: 'needs_mfa',
      email: pendingMfa.email,
      factorId: pendingMfa.factorId,
      challengeId: pendingMfa.challengeId,
    };
  }

  pendingMfa = null;
  return {
    status: 'signed_in',
    session,
    needsVaultUnlock: true,
  };
}

/** Dedicated page for email/OAuth return — avoids full popup bundle and some URL blocklists that target `popup.html` + tokens. */
export function getAuthEmailRedirectUrl(): string | undefined {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      return chrome.runtime.getURL('auth-callback.html');
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function signUp(email: string, password: string): Promise<{ userId: string }> {
  const client = getClient();
  const emailRedirectTo = getAuthEmailRedirectUrl();
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
  if (error) throw error;
  if (!data.user?.id) throw new Error('Signup failed');

  let session = data.session;
  if (!session) {
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (!signedIn.error && signedIn.data.session) session = signedIn.data.session;
  }
  if (!session) {
    throw new Error('Confirm your email, then sign in.');
  }

  const { data: after } = await client.auth.getSession();
  if (!after.session) {
    throw new Error('Session did not persist. Reload the extension and try again.');
  }

  return { userId: data.user.id };
}

export type EnrollStart = {
  factorId: string;
  qrCode: string;
  secret: string;
  challengeId: string;
};

export async function startMfaEnroll(): Promise<EnrollStart> {
  const client = getClient();
  const { data: enroll, error: e1 } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Vault',
  });
  if (e1 || !enroll) throw e1 ?? new Error('MFA enroll failed');
  const { data: ch, error: e2 } = await client.auth.mfa.challenge({ factorId: enroll.id });
  if (e2 || !ch) throw e2 ?? new Error('MFA challenge failed');
  return {
    factorId: enroll.id,
    qrCode: enroll.totp.qr_code,
    secret: enroll.totp.secret,
    challengeId: ch.id,
  };
}

export async function verifyMfaEnrollment(
  factorId: string,
  challengeId: string,
  code: string
): Promise<void> {
  const client = getClient();
  const { error } = await client.auth.mfa.verify({
    factorId,
    challengeId,
    code: code.replace(/\s/g, ''),
  });
  if (error) throw error;
}

/** Remove a pending (unverified) account MFA factor after signup — user chose to skip enrollment. */
export async function cancelMfaEnrollment(factorId: string): Promise<void> {
  const client = getClient();
  const { error } = await client.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

export async function signIn(email: string, password: string): Promise<AuthState> {
  const client = getClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return loadSession();
}

export async function completeMfaSignIn(
  factorId: string,
  challengeId: string,
  code: string
): Promise<AuthState> {
  const client = getClient();
  const { error } = await client.auth.mfa.verify({
    factorId,
    challengeId,
    code: code.replace(/\s/g, ''),
  });
  if (error) throw error;
  pendingMfa = null;
  const { data } = await client.auth.getSession();
  const session = data.session;
  if (!session?.user) return { status: 'signed_out' };
  return { status: 'signed_in', session, needsVaultUnlock: true };
}

export async function signOut(): Promise<void> {
  const client = getClient();
  pendingMfa = null;
  await client.auth.signOut();
}
