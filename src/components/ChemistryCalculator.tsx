import { useMemo, useState } from "react";
import { TANK_VOLUMES, REEL_LABELS, type ReelType } from "../lib/constants";
import { parseDilution, calculateChemistry } from "../lib/chemistry";

export function ChemistryCalculator({ dilution }: { dilution: string }) {
  const [tankIndex, setTankIndex] = useState(1); // Default: Universal tank
  const [reelType, setReelType] = useState<ReelType>("35mm");

  const tank = TANK_VOLUMES[tankIndex];
  const availableReels = useMemo(
    () => Object.keys(tank.volumes) as ReelType[],
    [tank]
  );

  // Reset reel if not available for selected tank
  const activeReel = availableReels.includes(reelType) ? reelType : availableReels[0];
  const totalMl = tank.volumes[activeReel] ?? 0;

  const parsed = useMemo(() => parseDilution(dilution), [dilution]);
  const result = useMemo(
    () => (parsed ? calculateChemistry(totalMl, parsed) : null),
    [totalMl, parsed]
  );

  return (
    <section className="rounded-3xl border border-(--color-border) bg-(--color-surface-secondary) p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-(--color-text-secondary) uppercase tracking-[0.08em] mb-3">
        Chemistry Calculator
      </h3>

      {!parsed ? (
        <p className="text-sm text-(--color-text-tertiary)">
          Enter a dilution ratio (e.g. 1+100) in Recipe Details to calculate chemistry.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-(--color-text-secondary) mb-1">
                Tank
              </label>
              <select
                value={tankIndex}
                onChange={(e) => setTankIndex(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent)"
              >
                {TANK_VOLUMES.map((t, i) => (
                  <option key={t.tank} value={i}>
                    {t.tank}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-(--color-text-secondary) mb-1">
                Reel Type
              </label>
              <select
                value={activeReel}
                onChange={(e) => setReelType(e.target.value as ReelType)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent)"
              >
                {availableReels.map((r) => (
                  <option key={r} value={r}>
                    {REEL_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-(--color-border) bg-(--color-surface) p-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-(--color-text-tertiary) uppercase tracking-wide">
                Total Volume
              </span>
              <span className="text-sm font-medium text-(--color-text-secondary)">
                {totalMl}ml
              </span>
            </div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs text-(--color-text-tertiary) uppercase tracking-wide">
                Dilution
              </span>
              <span className="text-sm font-medium text-(--color-text-secondary)">
                {dilution}
              </span>
            </div>
            <div className="h-px bg-(--color-border) my-2" />
            {result && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="text-center">
                  <p className="text-xs text-(--color-text-tertiary) uppercase tracking-wide mb-1">
                    Developer
                  </p>
                  <p
                    className="text-2xl font-medium text-(--color-accent)"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {result.developerMl}
                    <span className="text-sm ml-0.5">ml</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-(--color-text-tertiary) uppercase tracking-wide mb-1">
                    Water
                  </p>
                  <p
                    className="text-2xl font-medium text-(--color-text-primary)"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {result.waterMl}
                    <span className="text-sm ml-0.5">ml</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
