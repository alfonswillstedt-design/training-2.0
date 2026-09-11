import { useRef, useState } from 'react';
import { Button } from '../../design';
import type { IsoDate } from '../../scheduling/types';
import { exportJson, importJson, type AppData } from '../../storage';
import { strings } from '../../strings';

/**
 * Export och import som JSON — hela backup-lösningen när det inte finns någon
 * backend, och vägen in i en framtida native-app. Här ligger också vägen
 * tillbaka till ett tomt läge.
 *
 * Hör hemma under Inställningar. De finns inte förrän steg 6, så sektionen
 * bor tills vidare sist i Åtaganden och flyttas dit oförändrad.
 */

/**
 * Det som väntar på ett ja. Import och radering delar ruta, eftersom de
 * ställer samma fråga: vad försvinner om jag trycker?
 */
type Pending = { kind: 'import'; data: AppData } | { kind: 'reset' };

export function BackupSection({
  data,
  today,
  onReplace,
  onReset,
}: {
  data: AppData;
  today: IsoDate;
  onReplace: (data: AppData) => void;
  onReset: () => boolean;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function download() {
    const blob = new Blob([exportJson(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = strings.backup.filename(today);
    link.click();
    URL.revokeObjectURL(url);
  }

  async function pick(file: File) {
    setError(null);
    setPending(null);

    const result = importJson(await file.text());
    if (result.ok) setPending({ kind: 'import', data: result.data });
    else setError(strings.backup.failed[result.reason]);
  }

  return (
    <section className="mb-9">
      <h2 className="mb-3 text-[12px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
        {strings.backup.title}
      </h2>
      <p className="mb-4 text-[15px] leading-relaxed text-ink-soft">{strings.backup.lead}</p>

      <div className="flex flex-col gap-2">
        <Button variant="quiet" onClick={download}>
          {strings.backup.export}
        </Button>
        <Button variant="quiet" onClick={() => fileInput.current?.click()}>
          {strings.backup.import}
        </Button>
        <Button
          variant="quiet"
          onClick={() => {
            setError(null);
            setPending({ kind: 'reset' });
          }}
        >
          {strings.backup.reset}
        </Button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Nollställs så att samma fil går att välja igen.
          event.target.value = '';
          if (file) void pick(file);
        }}
      />

      {error && (
        <p className="mt-4 rounded-tight bg-accent-wash px-4 py-3 text-[14px] leading-snug text-ink">
          {error}
        </p>
      )}

      <p className="mt-5 text-[13px] text-ink-faint tabular-nums">
        {strings.backup.version(__BYGGD__)}
      </p>

      {pending && (
        <div className="mt-4 rounded-soft border border-line bg-raised p-5">
          <p className="text-[17px] font-semibold">
            {pending.kind === 'import' ? strings.backup.confirmTitle : strings.backup.resetTitle}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            {pending.kind === 'import'
              ? strings.backup.confirmBody(
                  pending.data.commitments.length,
                  pending.data.completedSessions.length,
                )
              : strings.backup.resetBody(data.commitments.length, data.completedSessions.length)}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button
              variant={pending.kind === 'import' ? 'primary' : 'danger'}
              onClick={() => {
                if (pending.kind === 'import') {
                  onReplace(pending.data);
                  setPending(null);
                  return;
                }
                // Gick raderingen inte igenom ligger datan kvar. Att stänga
                // rutan då vore en lögn — rutan står kvar med felet i stället.
                if (onReset()) setPending(null);
                else setError(strings.backup.resetFailed);
              }}
            >
              {pending.kind === 'import' ? strings.backup.replace : strings.backup.resetConfirm}
            </Button>
            <Button variant="quiet" onClick={() => setPending(null)}>
              {strings.backup.cancel}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
