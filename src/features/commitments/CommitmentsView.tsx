import { useState, type ReactNode } from 'react';
import { Button, clockRange, EmptyState, Screen, ScreenHeader } from '../../design';
import type { Commitment, CommitmentException, IsoDate } from '../../scheduling/types';
import { strings } from '../../strings';
import {
  addCommitment,
  addException,
  exceptionsInWeek,
  newCommitment,
  removeCommitment,
  removeExceptionAt,
  updateCommitment,
} from './commitmentActions';
import { CommitmentEditor } from './CommitmentEditor';
import { ExceptionEditor } from './ExceptionEditor';

/**
 * Flik 3 — det som tar upp tid.
 *
 * Två sorter, båda behövs: återkommande regler som sätts upp en gång, och
 * undantag för den här veckan som överskrider dem utan att ändra dem.
 * Ingenting sparas med en knapp — varje ändring räknar om veckan direkt.
 */
export function CommitmentsView({
  commitments,
  dates,
  today,
  onChange,
  note,
  footer,
}: {
  commitments: Commitment[];
  dates: IsoDate[];
  today: IsoDate;
  onChange: (next: Commitment[]) => void;
  /** Besked om lagringen, när den inte beter sig som den ska. */
  note?: string | undefined;
  /** Sist på sidan. Här bor export och import tills Inställningar finns. */
  footer?: ReactNode | undefined;
}) {
  const [draft, setDraft] = useState<Commitment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingException, setAddingException] = useState(false);

  const editing = commitments.find((item) => item.id === editingId) ?? null;
  const exceptions = exceptionsInWeek(commitments, dates);

  return (
    <>
      <Screen>
        {note && (
          <p className="mb-7 rounded-tight bg-accent-wash px-4 py-3 text-[14px] leading-snug text-ink">
            {note}
          </p>
        )}

        {commitments.length === 0 ? (
          <EmptyState
            title={strings.commitments.empty.title}
            body={strings.commitments.empty.body}
            action={strings.commitments.empty.action}
            onAction={() => setDraft(newCommitment())}
          />
        ) : (
          <>
            <ScreenHeader title={strings.commitments.title} lead={strings.commitments.lead} />

            <Section title={strings.commitments.recurring}>
              <Card>
                {commitments.map((commitment) => (
                  <Row key={commitment.id} onClick={() => setEditingId(commitment.id)}>
                    <span className="flex items-center gap-2">
                      <span className="text-[17px] font-semibold">{commitment.label}</span>
                      {commitment.needsMealAfter && (
                        <span className="rounded-tight bg-accent-wash px-2 py-0.5 text-[11px] font-semibold text-accent">
                          {strings.commitments.mealAfterBadge}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[14px] text-ink-soft">
                      {strings.weekdays.format(commitment.weekdays)} ·{' '}
                      <span className="tabular-nums">
                        {clockRange(commitment.start, commitment.end)}
                      </span>
                    </span>
                  </Row>
                ))}
              </Card>
              <div className="mt-3">
                <Button variant="quiet" onClick={() => setDraft(newCommitment())}>
                  {strings.commitments.add}
                </Button>
              </div>
            </Section>

            <Section title={strings.commitments.thisWeek}>
              {exceptions.length === 0 ? (
                <p className="text-[15px] text-ink-soft">{strings.commitments.noExceptions}</p>
              ) : (
                <Card>
                  {exceptions.map((item) => (
                    <li
                      key={`${item.commitmentId}-${item.index}`}
                      className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 last:border-b-0"
                    >
                      <span>
                        <span className="block text-[15px] font-semibold">
                          {item.label} · {strings.relativeDay(item.exception.date, today)}
                        </span>
                        <span className="mt-0.5 block text-[14px] text-ink-soft tabular-nums">
                          {strings.exception(
                            item.exception.kind,
                            'start' in item.exception ? item.exception.start : undefined,
                            'end' in item.exception ? item.exception.end : undefined,
                          )}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(removeExceptionAt(commitments, item.commitmentId, item.index))
                        }
                        className="-mr-2 shrink-0 px-2 py-2 text-[14px] font-medium text-accent"
                      >
                        {strings.exceptionEditor.remove}
                      </button>
                    </li>
                  ))}
                </Card>
              )}
              <div className="mt-3">
                <Button variant="quiet" onClick={() => setAddingException(true)}>
                  {strings.commitments.addException}
                </Button>
              </div>
            </Section>
          </>
        )}

        {footer}
      </Screen>

      {draft && (
        <CommitmentEditor
          commitment={draft}
          isNew
          onChange={(patch) => setDraft({ ...draft, ...patch })}
          onCreate={() => {
            onChange(addCommitment(commitments, { ...draft, label: draft.label.trim() }));
            setDraft(null);
          }}
          onRemove={() => setDraft(null)}
          onClose={() => setDraft(null)}
        />
      )}

      {editing && (
        <CommitmentEditor
          commitment={editing}
          isNew={false}
          onChange={(patch) => onChange(updateCommitment(commitments, editing.id, patch))}
          onCreate={() => setEditingId(null)}
          onRemove={() => {
            onChange(removeCommitment(commitments, editing.id));
            setEditingId(null);
          }}
          onClose={() => setEditingId(null)}
        />
      )}

      {addingException && commitments.length > 0 && (
        <ExceptionEditor
          commitments={commitments}
          dates={dates}
          onCreate={(commitmentId: string, exception: CommitmentException) => {
            onChange(addException(commitments, commitmentId, exception));
            setAddingException(false);
          }}
          onClose={() => setAddingException(false)}
        />
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-9">
      <h2 className="mb-3 text-[12px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <ul className="overflow-hidden rounded-soft border border-line bg-raised">{children}</ul>
  );
}

function Row({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <li className="border-b border-line last:border-b-0">
      <button type="button" onClick={onClick} className="w-full px-4 py-3.5 text-left">
        {children}
      </button>
    </li>
  );
}
