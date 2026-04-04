const STORAGE_KEY = 'inkryptVault2faV1';

export type Vault2faBlob = { cipherB64: string; ivB64: string };

type StoreShape = Record<string, Vault2faBlob>;

async function readStore(): Promise<StoreShape> {
  const got = await chrome.storage.local.get(STORAGE_KEY);
  const raw = got[STORAGE_KEY];
  if (!raw || typeof raw !== 'object') return {};
  return raw as StoreShape;
}

export async function getVault2faBlob(userId: string): Promise<Vault2faBlob | null> {
  const s = await readStore();
  const b = s[userId];
  if (!b?.cipherB64 || !b?.ivB64) return null;
  return b;
}

export async function setVault2faBlob(userId: string, blob: Vault2faBlob): Promise<void> {
  const s = await readStore();
  s[userId] = blob;
  await chrome.storage.local.set({ [STORAGE_KEY]: s });
}

export async function removeVault2faBlob(userId: string): Promise<void> {
  const s = await readStore();
  delete s[userId];
  await chrome.storage.local.set({ [STORAGE_KEY]: s });
}

export async function isVault2faEnabled(userId: string): Promise<boolean> {
  return (await getVault2faBlob(userId)) != null;
}
