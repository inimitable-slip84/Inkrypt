import { useState, type ReactNode } from "react";
import { sendMessage } from "../api";
import AppVersion from "./AppVersion";
import MainLogo from "./MainLogo";
import ThemeToggle from "./ThemeToggle";
import { useAppStore, type View } from "../store";

type Phase = "loading" | "auth" | "unlock" | "vault";

type Props = {
  phase: Phase;
  view: View;
  onRefresh: () => void;
};

function IconVault({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M12 10V7a3 3 0 0 0-6 0v3" />
      <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconPlus({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function IconGear({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconUser({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconUserPlus({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

function IconLock({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconShield({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconLogout({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function NavRow({
  icon,
  label,
  sub,
  active,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  sub?: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`app-sidebar__item flex w-full min-w-0 items-center gap-2.5 rounded-lg px-3 py-1 text-left transition-colors ${
        active
          ? "app-sidebar__item--active"
          : "hover:bg-[color-mix(in_srgb,var(--vault-text)_6%,transparent)]"
      } ${disabled ? "cursor-default opacity-60" : ""}`}
    >
      <span
        className={`shrink-0 ${active ? "text-vault-accent" : "text-vault-muted"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="block truncate text-[0.8125rem] font-medium leading-tight text-vault-text">
          {label}
        </span>
        {sub && (
          <span className="mt-0.5 block truncate text-[0.65rem] leading-tight text-vault-subtle">
            {sub}
          </span>
        )}
      </span>
    </button>
  );
}

export function phaseFromView(view: View): Phase {
  if (view === "loading") return "loading";
  if (view === "signin" || view === "signup" || view === "signin-mfa")
    return "auth";
  if (view === "unlock") return "unlock";
  return "vault";
}

export default function AppSidebar({ phase, view, onRefresh }: Props) {
  const setView = useAppStore((s) => s.setView);
  const setEditingEntry = useAppStore((s) => s.setEditingEntry);
  const [signingOut, setSigningOut] = useState(false);
  const [lockingVault, setLockingVault] = useState(false);

  async function lockVault() {
    setLockingVault(true);
    try {
      await sendMessage({ type: "LOCK_VAULT" });
      await onRefresh();
    } finally {
      setLockingVault(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await sendMessage({ type: "SIGN_OUT" });
      await onRefresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <aside className="app-sidebar w-44 border-r border-vault-border bg-[var(--app-dashboard-bg)]">
      <div className="shrink-0 border-b border-vault-border/80 px-2.5 py-2">
        <MainLogo variant="sidebar" className="max-w-full" />
      </div>

      <nav
        className="flex shrink-0 flex-col justify-start gap-1.5 overflow-hidden px-1.5 pb-0.5 pt-2"
        aria-label="Main"
      >
        {phase === "loading" && (
          <p className="px-2 py-1 text-center text-[0.65rem] text-vault-subtle">
            Loading…
          </p>
        )}

        {phase === "auth" && (
          <>
            <NavRow
              icon={<IconUser />}
              label="Sign in"
              active={view === "signin"}
              onClick={() => setView("signin")}
            />
            <NavRow
              icon={<IconUserPlus />}
              label="Create account"
              active={view === "signup"}
              onClick={() => setView("signup")}
            />
            {view === "signin-mfa" && (
              <NavRow
                icon={<IconShield />}
                label="Authenticator"
                active
                disabled
              />
            )}
          </>
        )}

        {phase === "unlock" && (
          <NavRow icon={<IconLock />} label="Unlock vault" active />
        )}

        {phase === "vault" && (
          <>
            <NavRow
              icon={<IconVault />}
              label="Vault"
              active={view === "vault"}
              onClick={() => setView("vault")}
            />
            <NavRow
              icon={<IconPlus />}
              label="Add entry"
              active={view === "add"}
              onClick={() => {
                setEditingEntry(null);
                setView("add");
              }}
            />
            <NavRow
              icon={<IconGear />}
              label="Settings"
              active={view === "settings"}
              onClick={() => setView("settings")}
            />
          </>
        )}
      </nav>

      {/* Fills column height so Sign out / footer sit on the bottom (flex % height on aside is flaky). */}
      <div className="min-h-0 min-w-0 flex-1" aria-hidden />

      <div className="shrink-0 space-y-0.5 border-t border-vault-border/80 px-1.5 pt-1 pb-2.5">
        {phase === "vault" && (
          <>
            <button
              type="button"
              disabled={lockingVault || signingOut}
              onClick={() => void lockVault()}
              className="app-sidebar__lock-vault flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-1 text-left text-[0.8125rem] font-medium text-vault-muted transition-colors hover:bg-[color-mix(in_srgb,var(--vault-text)_6%,transparent)] hover:text-vault-text disabled:opacity-40"
            >
              <IconLock className="h-5 w-5 shrink-0" />
              <span className="truncate">
                {lockingVault ? "Locking…" : "Lock vault"}
              </span>
            </button>
            <button
              type="button"
              disabled={signingOut || lockingVault}
              onClick={() => void signOut()}
              className="app-sidebar__signout flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-1 text-left text-[0.8125rem] font-medium text-vault-muted transition-colors hover:bg-[color-mix(in_srgb,var(--vault-text)_6%,transparent)] hover:text-vault-text disabled:opacity-40"
            >
              <IconLogout className="h-5 w-5 shrink-0" />
              <span className="truncate">
                {signingOut ? "Signing out…" : "Sign out"}
              </span>
            </button>
          </>
        )}
        <div className="flex min-w-0 items-center justify-between gap-1 px-0.5">
          <AppVersion className="min-w-0 max-w-[88px] shrink text-[0.5rem] leading-tight" />
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
