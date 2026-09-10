import { useState } from 'react';
import { clock, clockRange, duration, Button, Sheet } from '../../design';
import type { Commitment, IsoDate, PlannedDay } from '../../scheduling/types';
import { strings } from '../../strings';
import {
  addCommitment,
  asOneOff,
  newCommitment,
  removeCommitment,
  updateCommitment,
} from '../commitments/commitmentActions';
import { CommitmentEditor } from '../commitments/CommitmentEditor';

/**
 * En dag i närbild. Härifrån ändras dagen — vilket alltid betyder att ändra
 * ett åtagande, aldrig passet. Passets tid är ett resultat.
 */
export function DaySheet({
  day,
  dates,
  commitments,
  onChange,
  onClose,
}: {
  day: PlannedDay;
  /** Veckans datum, som redigeraren behöver för att välja dag. */
  dates: IsoDate[];
  commitments: Commitment[];
  onChange: (next: Commitment[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Commitment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editing = commitments.find((item) => item.id === editingId) ?? null;

  return (
    <>
      <Sheet title={strings.dayLabel(day.date)} closeLabel={strings.week.close} onClose={onClose}>
        {day.session ? (
          <div className="mb-8 rounded-soft border border-line bg-raised px-5 py-4">
            <p className="text-[12px] font-semibold tracking-[0.14em] text-accent-text uppercase">
              {day.session.sessionName}
            </p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">
              {clockRange(day.session.start, day.session.end)}
            </p>
            <p className="mt-1 text-[14px] text-ink-soft">
              {duration(day.session.end - day.session.start)} ·{' '}
              {strings.holdPoints.leaveHome.toLowerCase()}{' '}
              <span className="tabular-nums">{clock(day.session.leaveHome)}</span>
            </p>
          </div>
        ) : (
          day.reason && (
            <p className="mb-8 rounded-tight bg-accent-wash px-4 py-3 text-[14px] leading-snug text-ink">
              {strings.reason(day.reason)}
            </p>
          )
        )}

        <h3 className="mb-3 text-[12px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
          {strings.week.commitmentsLabel}
        </h3>

        {day.commitments.length === 0 ? (
          <p className="text-[15px] text-ink-soft">{strings.week.noCommitments}</p>
        ) : (
          <ul className="overflow-hidden rounded-soft border border-line bg-raised">
            {day.commitments.map((block, index) => {
              const source = commitments.find((item) => item.id === block.commitmentId);
              return (
                <li key={`${block.commitmentId}-${index}`} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    disabled={!source}
                    onClick={() => source && setEditingId(source.id)}
                    className="w-full px-4 py-3.5 text-left"
                  >
                    <span className="block text-[16px] font-semibold">{block.label}</span>
                    <span className="mt-0.5 block text-[14px] text-ink-soft tabular-nums">
                      {clockRange(block.start, block.end)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-3">
          <Button
            variant="quiet"
            onClick={() => {
              // Man tittar på en dag, inte på en vecka. Förvalet är därför
              // något som händer just den dagen — inte varje vecka.
              const fresh = newCommitment();
              setDraft({ ...fresh, ...asOneOff(fresh, day.date, fresh.start, fresh.end) });
            }}
          >
            {strings.week.add}
          </Button>
        </div>
      </Sheet>

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
