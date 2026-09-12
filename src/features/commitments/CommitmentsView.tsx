import { useState } from 'react';
import { Button, clockRange, EmptyState, Screen, ScreenHeader } from '../../design';
import type { Commitment, IsoDate } from '../../scheduling/types';
import { strings } from '../../strings';
import {
  addCommitment,
  newCommitment,
  recurringCommitments,
  removeCommitment,
  updateCommitment,
} from './commitmentActions';
import { CommitmentEditor } from './CommitmentEditor';

/**
 * Flik 3 — reglerna. Det som händer varje vecka, en gång uppsatt.
 *
 * En enskild dag ändras inte här utan i Veckan, där man ser den. Listan över
 * veckans avvikelser låg tidigare här under ordet "undantag" — ett ord som
 * beskrev maskineriet och tvingade en att leta i fel flik för appens
 * vanligaste ändring. Ingenting sparas med en knapp.
 */
export function CommitmentsView({
  commitments,
  dates,
  today,
  onChange,
  note,
}: {
  commitments: Commitment[];
  dates: IsoDate[];
  today: IsoDate;
  onChange: (next: Commitment[]) => void;
  /** Besked om lagringen, när den inte beter sig som den ska. */
  note?: string | undefined;
}) {
  const [draft, setDraft] = useState<Commitment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = commitments.find((item) => item.id === editingId) ?? null;
  // En markering dragen i veckovyn är inget återkommande åtagande. Den hör
  // hemma på dagen den ligger på, inte i listan över det som återkommer.
  const recurring = recurringCommitments(commitments);

  return (
    <>
      <Screen>
        {note && (
          <p className="mb-7 rounded-tight bg-accent-wash px-4 py-3 text-[14px] leading-snug text-ink">
            {note}
          </p>
        )}

        {recurring.length === 0 ? (
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
                {recurring.map((commitment) => (
                  <Row key={commitment.id} onClick={() => setEditingId(commitment.id)}>
                    <span className="flex items-center gap-2">
                      <span className="text-[17px] font-semibold">{commitment.label}</span>
                      {commitment.needsMealAfter && (
                        <span className="rounded-tight bg-accent-wash px-2 py-0.5 text-[11px] font-semibold text-accent-text">
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

          </>
        )}
      </Screen>

      {draft && (
        <CommitmentEditor
          commitment={draft}
          isNew
          dates={dates}
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
          dates={dates}
          onChange={(patch) => onChange(updateCommitment(commitments, editing.id, patch))}
          onCreate={() => setEditingId(null)}
          onRemove={() => {
            onChange(removeCommitment(commitments, editing.id));
            setEditingId(null);
          }}
          onClose={() => setEditingId(null)}
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
