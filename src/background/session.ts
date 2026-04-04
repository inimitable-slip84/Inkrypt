const LOCK_MS = 5 * 60 * 1000;
const ALARM = 'vault-inactivity-check';

let lastActivity = Date.now();

export function touchActivity(): void {
  lastActivity = Date.now();
}

export function scheduleLockAlarm(): void {
  chrome.alarms.create(ALARM, { periodInMinutes: 1 });
}

export function clearLockAlarm(): void {
  chrome.alarms.clear(ALARM);
}

export function shouldAutoLock(): boolean {
  return Date.now() - lastActivity >= LOCK_MS;
}
