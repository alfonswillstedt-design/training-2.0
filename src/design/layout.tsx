import type { ReactNode } from 'react';
import { strings } from '../strings';

/**
 * Skärmens ram och navigationen.
 *
 * Bottenflikar, aldrig en hamburgermeny. Innehållet respekterar
 * safe-area-inset så att det inte hamnar under iPhones hemindikator när appen
 * körs från hemskärmen.
 */

const CONTENT = 'mx-auto w-full max-w-[430px] px-6';

/** Mobilen först: 390 px är måttet, allt annat skalar uppåt. */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <main
      className={`${CONTENT} flex min-h-dvh flex-col pt-[max(2.5rem,env(safe-area-inset-top))] pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom)+1.5rem)]`}
    >
      {children}
    </main>
  );
}

/** Sidhuvud för de vyer som inte domineras av ett klockslag. */
export function ScreenHeader({ title, lead }: { title: string; lead?: string | undefined }) {
  return (
    <header className="mb-8">
      <h1 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.025em]">{title}</h1>
      {lead && <p className="mt-2 text-[15px] text-ink-soft">{lead}</p>}
    </header>
  );
}

export type TabId = 'next' | 'week' | 'commitments' | 'plan';

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: 'next', label: strings.tabs.next, icon: <ClockIcon /> },
  { id: 'week', label: strings.tabs.week, icon: <WeekIcon /> },
  { id: 'commitments', label: strings.tabs.commitments, icon: <BlocksIcon /> },
  { id: 'plan', label: strings.tabs.plan, icon: <PlanIcon /> },
];

export function TabBar({ active, onChange }: { active: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper">
      <div className={`${CONTENT} flex px-2 pb-[env(safe-area-inset-bottom)]`}>
        {TABS.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              onClick={() => onChange(tab.id)}
              className={`flex h-[var(--tabbar-height)] flex-1 flex-col items-center justify-center gap-1 ${
                selected ? 'text-accent' : 'text-ink-faint'
              }`}
            >
              {tab.icon}
              <span className={`text-[11px] ${selected ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Helskärmsark för inmatning. Täcker flikraden, eftersom man gör en sak i
 * taget på en telefon.
 */
export function Sheet({
  title,
  onClose,
  closeLabel,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode | undefined;
}) {
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper">
      <div className="flex-1 overflow-y-auto">
        <div className={`${CONTENT} pt-[max(1.25rem,env(safe-area-inset-top))] pb-8`}>
          <div className="mb-7 flex items-center justify-between gap-4">
            <h2 className="text-[22px] font-semibold tracking-[-0.015em]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 shrink-0 px-2 text-[15px] font-medium text-accent"
            >
              {closeLabel}
            </button>
          </div>
          {children}
        </div>
      </div>

      {footer && (
        <div className="border-t border-line bg-paper">
          <div className={`${CONTENT} py-4 pb-[max(1rem,env(safe-area-inset-bottom))]`}>
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 7.5V12l3 1.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WeekIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15" rx="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 3.5V6M16 3.5V6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 14.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 7.5h6M5 12h9M5 16.5h4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="18" cy="16.5" r="2.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function BlocksIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="4.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3.5" y="12" width="11" height="4.5" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 20.5h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Varje lista som kan vara tom har en egen vy som säger vad man gör härnäst.
 * Ingen tom yta någonstans.
 */
export function EmptyState({
  title,
  body,
  action,
  onAction,
  children,
}: {
  title: string;
  body: string;
  action?: string | undefined;
  onAction?: (() => void) | undefined;
  children?: ReactNode | undefined;
}) {
  return (
    <section className="flex flex-1 flex-col justify-center">
      <h1 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.025em]">{title}</h1>
      <p className="mt-4 text-[16px] leading-relaxed text-ink-soft">{body}</p>
      {children}
      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-7 w-full rounded-tight bg-accent px-5 py-4 text-[16px] font-semibold text-accent-ink active:scale-[0.99]"
        >
          {action}
        </button>
      )}
    </section>
  );
}
