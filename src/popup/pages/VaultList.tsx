import { useEffect, useMemo, useRef, useState } from 'react';
import { generateTOTPCode } from '../../utils/totp';
import { sendMessage } from '../api';
import VaultConfirmDialog from '../components/VaultConfirmDialog';
import { useAppStore } from '../store';

type Props = {
  onAdd: () => void;
  onRefresh: () => void;
};

type CopyKind = 'password' | 'totp';

function IconCheck({ className = 'h-[15px] w-[15px]' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconClipboard({ className = 'h-[15px] w-[15px]' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconPencil({ className = 'h-[15px] w-[15px]' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function IconTrash({ className = 'h-[15px] w-[15px]' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconKey({ className = 'h-[15px] w-[15px]' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 2.5 2.5" />
      <path d="M17 5l2.5 2.5" />
    </svg>
  );
}

function IconPlusCircle({ className = 'h-[15px] w-[15px]' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function IconChevronDown({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function faviconUrl(hostname: string): string {
  const h = hostname.trim().toLowerCase().replace(/^www\./, '') || hostname;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=64`;
}

function EntryFavicon({ site }: { site: string }) {
  const [failed, setFailed] = useState(false);
  const initial =
    site
      .replace(/^www\./i, '')
      .split('.')
      .filter(Boolean)[0]
      ?.slice(0, 1)
      .toUpperCase() ?? '?';

  if (failed) {
    return (
      <div className="vault-entry-favicon vault-entry-favicon--fallback" aria-hidden>
        {initial}
      </div>
    );
  }

  return (
    <img
      src={faviconUrl(site)}
      alt=""
      width={44}
      height={44}
      className="vault-entry-favicon"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function VaultList({ onAdd, onRefresh }: Props) {
  const entries = useAppStore((s) => s.entries);
  const setView = useAppStore((s) => s.setView);
  const setEditingEntry = useAppStore((s) => s.setEditingEntry);
  const [, setTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(() => new Set());
  const copyTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function copyFlashKey(entryId: string, kind: CopyKind): string {
    return `${entryId}::${kind}`;
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const site = (e.site_url ?? '').toLowerCase();
      const label = (e.label ?? '').toLowerCase();
      const user = (e.username ?? '').toLowerCase();
      return site.includes(q) || label.includes(q) || user.includes(q);
    });
  }, [entries, searchQuery]);

  const deleteTarget = useMemo(
    () => (deleteId ? entries.find((e) => e.id === deleteId) : null),
    [entries, deleteId]
  );

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      copyTimers.current.forEach((t) => clearTimeout(t));
      copyTimers.current.clear();
    };
  }, []);

  useEffect(() => {
    if (expandedEntryId && !filtered.some((x) => x.id === expandedEntryId)) {
      setExpandedEntryId(null);
    }
  }, [filtered, expandedEntryId]);

  function flashCopied(entryId: string, kind: CopyKind) {
    const key = copyFlashKey(entryId, kind);
    const prev = copyTimers.current.get(key);
    if (prev) clearTimeout(prev);
    setCopiedKeys((s) => new Set(s).add(key));
    const t = window.setTimeout(() => {
      setCopiedKeys((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
      copyTimers.current.delete(key);
    }, 1800);
    copyTimers.current.set(key, t);
  }

  async function copyWithFeedback(entryId: string, kind: CopyKind, text: string) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        await sendMessage({ type: 'COPY_TO_CLIPBOARD', text });
        ok = true;
      } catch {
        ok = false;
      }
    }
    if (ok) flashCopied(entryId, kind);
  }

  async function commitDelete() {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    try {
      await sendMessage({ type: 'DELETE_ENTRY', id });
      await onRefresh();
    } catch {
      /* ignore */
    }
  }

  function openEdit(e: (typeof entries)[0]) {
    setEditingEntry(e);
    setView('add');
  }

  return (
    <div className="vault-page relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <header className="vault-list-header shrink-0 px-4 pb-3 pt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="vault-eyebrow text-[0.55rem]">Sealed ledger</p>
          {entries.length > 0 && (
            <span className="text-[0.62rem] font-semibold tabular-nums tracking-wide text-vault-subtle">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          )}
        </div>
        {entries.length > 0 && (
          <input
            type="search"
            className="vault-list-search mt-3"
            placeholder="Search site, label, or username…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search vault entries"
            autoComplete="off"
            spellCheck={false}
          />
        )}
      </header>

      <div className="vault-list-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-4 py-3 pb-4">
        {entries.length === 0 && (
          <div className="mx-auto mt-4 max-w-[17rem] rounded-2xl border border-dashed border-vault-border-strong/80 bg-vault-surface/60 px-5 py-10 text-center shadow-inner">
            <p className="font-display text-lg font-medium text-vault-text">No seals yet</p>
            <p className="mt-2 text-sm leading-relaxed text-vault-muted">
              Store a login for any site you use — it stays encrypted on your device until you unlock the
              vault.
            </p>
            <button
              type="button"
              onClick={onAdd}
              className="vault-btn-primary mt-5 !w-auto px-6 text-xs uppercase tracking-wider"
            >
              Add first entry
            </button>
          </div>
        )}

        {entries.length > 0 && filtered.length === 0 && (
          <p className="rounded-xl border border-dashed border-vault-border bg-vault-surface px-4 py-8 text-center text-sm text-vault-muted">
            No entries match &ldquo;{searchQuery.trim()}&rdquo;.
          </p>
        )}

        {filtered.map((e) => {
          const totp = e.totpSecret ? generateTOTPCode(e.totpSecret) : null;
          const pwCopied = copiedKeys.has(copyFlashKey(e.id, 'password'));
          const totpCopied = copiedKeys.has(copyFlashKey(e.id, 'totp'));
          const expanded = totp != null && expandedEntryId === e.id;
          const headerBody = (
            <>
              <EntryFavicon site={e.site_url} />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[1.05rem] font-semibold leading-snug tracking-tight text-vault-text">
                  {e.site_url}
                </h2>
                {e.label && (
                  <p className="mt-1 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-vault-accent/90">
                    {e.label}
                  </p>
                )}
                <p
                  className="mt-1.5 font-mono text-[0.78rem] leading-snug text-vault-muted [overflow-wrap:anywhere]"
                  title={e.username ?? undefined}
                >
                  {e.username || '—'}
                </p>

                {e.passwordMissing && (
                  <p className="mt-2 rounded-lg border border-vault-border-strong/90 bg-vault-raised/90 px-2.5 py-2 text-xs leading-relaxed text-vault-muted">
                    No encrypted password on file. Use the + button below to complete this entry.
                  </p>
                )}
              </div>
            </>
          );

          return (
            <article
              key={e.id}
              className={`vault-entry-card${expanded ? ' vault-entry-card--expanded' : ''}`}
            >
              <div className="px-3.5 pt-3.5">
                {totp ? (
                  <button
                    type="button"
                    className="vault-entry-card__header-trigger"
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Collapse 2FA details' : 'Expand to show 2FA code'}
                    onClick={() =>
                      setExpandedEntryId((cur) => (cur === e.id ? null : e.id))
                    }
                  >
                    {headerBody}
                    <IconChevronDown
                      className={`vault-entry-chevron${expanded ? ' vault-entry-chevron--open' : ''}`}
                    />
                  </button>
                ) : (
                  <div className="vault-entry-card__header-static">{headerBody}</div>
                )}
              </div>

              {totp && (
                <div className={`vault-entry-expand${expanded ? ' vault-entry-expand--open' : ''}`}>
                  <div className="vault-entry-expand__inner">
                    <div className="vault-entry-totp-hero">
                      <p className="vault-entry-totp-hero__label">One-time code</p>
                      <p className="vault-entry-totp-hero__code" aria-live="polite">
                        {totp.code.slice(0, 3)} {totp.code.slice(3)}
                      </p>
                      <div className="vault-entry-totp-hero__actions">
                        <span className="vault-entry-totp-hero__timer">{totp.secondsLeft}s left</span>
                        <button
                          type="button"
                          className={`vault-entry-pill-btn${totpCopied ? ' vault-entry-pill-btn--success' : ''}`}
                          title={totpCopied ? 'Copied' : 'Copy 2FA code'}
                          aria-label={totpCopied ? '2FA code copied' : 'Copy 2FA code'}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            void copyWithFeedback(e.id, 'totp', totp.code);
                          }}
                        >
                          {totpCopied ? <IconCheck className="h-3.5 w-3.5" /> : <IconClipboard className="h-3.5 w-3.5" />}
                          {totpCopied ? 'Copied' : 'Copy code'}
                        </button>
                      </div>
                    </div>

                    <div className="vault-entry-password-panel">
                      <span className="vault-entry-password-panel__label">Password</span>
                      {e.passwordMissing ? (
                        <button
                          type="button"
                          className="vault-entry-pill-btn vault-entry-pill-btn--accent"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            openEdit(e);
                          }}
                        >
                          Complete
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`vault-entry-pill-btn vault-entry-pill-btn--accent${pwCopied ? ' vault-entry-pill-btn--success' : ''}`}
                          title={pwCopied ? 'Copied' : 'Copy password'}
                          aria-label={pwCopied ? 'Password copied' : 'Copy password'}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            void copyWithFeedback(e.id, 'password', e.password);
                          }}
                        >
                          {pwCopied ? <IconCheck className="h-3.5 w-3.5" /> : <IconKey className="h-3.5 w-3.5" />}
                          {pwCopied ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="vault-entry-toolbar px-3.5 pb-3.5 pt-0">
                <div className="vault-entry-toolbar__primary">
                  {!(totp && expanded) &&
                    (e.passwordMissing ? (
                      <button
                        type="button"
                        onClick={() => openEdit(e)}
                        className="vault-entry-icon-btn vault-entry-icon-btn--accent"
                        title="Complete entry"
                        aria-label="Complete entry — add password"
                      >
                        <IconPlusCircle />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void copyWithFeedback(e.id, 'password', e.password)}
                        className={`vault-entry-icon-btn vault-entry-icon-btn--accent${pwCopied ? ' vault-entry-icon-btn--success' : ''}`}
                        title={pwCopied ? 'Copied' : 'Copy password'}
                        aria-label={pwCopied ? 'Password copied' : 'Copy password'}
                      >
                        {pwCopied ? <IconCheck /> : <IconKey />}
                      </button>
                    ))}
                  {totp && !expanded && (
                    <span
                      className="vault-totp-inline text-[0.7rem] opacity-90"
                      title="Tap the card header to view the code"
                    >
                      2FA
                    </span>
                  )}
                </div>
                <div className="vault-entry-toolbar__meta shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(e)}
                    className="vault-entry-icon-btn"
                    title="Edit entry"
                    aria-label="Edit entry"
                  >
                    <IconPencil />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(e.id)}
                    className="vault-entry-icon-btn vault-entry-icon-btn--danger"
                    title="Delete entry"
                    aria-label="Delete entry"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <VaultConfirmDialog
        open={deleteId != null}
        title="Delete this entry?"
        description={
          deleteTarget ? (
            <>
              Remove the login for{' '}
              <strong className="text-vault-text">{deleteTarget.site_url}</strong>
              {deleteTarget.username ? (
                <>
                  {' '}
                  <span className="text-vault-subtle">·</span>{' '}
                  <span className="font-mono text-[0.92em] text-vault-text">{deleteTarget.username}</span>
                </>
              ) : null}
              . This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => void commitDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
