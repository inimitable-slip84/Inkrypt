import { useEffect, useId, useState, type ReactNode } from 'react';

type Props = {
  ariaLabel: string;
  children: ReactNode;
};

export default function InfoTipButton({ ariaLabel, children }: Props) {
  const tipId = useId();
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const open = pinned || hover;

  useEffect(() => {
    if (!pinned) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPinned(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinned]);

  return (
    <span
      className="relative inline-flex shrink-0 align-middle"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded-full border border-transparent text-vault-subtle transition-colors hover:border-vault-border hover:bg-vault-canvas/80 hover:text-vault-text focus-visible:outline focus-visible:ring-2 focus-visible:ring-vault-accent"
        aria-expanded={open}
        aria-controls={open ? tipId : undefined}
        aria-label={ariaLabel}
        onClick={() => setPinned((p) => !p)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.744 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div
          id={tipId}
          role="tooltip"
          className="absolute right-0 top-full z-30 w-max max-w-[18rem] pt-2"
        >
          <div className="rounded-lg border border-vault-border-strong bg-vault-raised px-3 py-2 text-left text-xs leading-relaxed text-vault-muted shadow-vault">
            {children}
          </div>
        </div>
      )}
    </span>
  );
}
