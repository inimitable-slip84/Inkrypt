import type { MessagePayload, MessageResponse } from '../utils/messages';

export async function sendMessage<T = unknown>(msg: MessagePayload): Promise<T> {
  const res = (await chrome.runtime.sendMessage(msg)) as MessageResponse & { data?: T };
  if (!res?.ok) throw new Error('error' in res ? res.error : 'Unknown error');
  return res.data as T;
}
