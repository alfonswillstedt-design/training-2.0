import type { IsoDate, PlannedDay, PlannedSession } from '../../scheduling/types';

export type DayWithSession = PlannedDay & { session: PlannedSession };

/**
 * Första dagen efter `date` som faktiskt får ett pass.
 *
 * En vilodag som bara säger "du behöver minst en i veckan" lämnar frågan
 * obesvarad: vart tog träningen vägen? Det här svarar på den utan att motorn
 * behöver hålla reda på något före och efter — vart nästa pass ligger är sant
 * oavsett hur dagen blev vilodag.
 */
export function nextSessionAfter(days: PlannedDay[], date: IsoDate): DayWithSession | null {
  return (
    days.find((day): day is DayWithSession => day.date > date && day.session !== null) ?? null
  );
}
