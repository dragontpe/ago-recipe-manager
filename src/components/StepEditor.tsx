import { useAppStore } from "../lib/store";
import type { Recipe, Step } from "../lib/types";
import { AGITATION_OPTIONS, COMPENSATION_OPTIONS } from "../lib/constants";

interface StepEditorProps {
  step: Step;
  recipe: Recipe;
  dragHandleProps: Record<string, unknown>;
}

export function StepEditor({ step, recipe, dragHandleProps }: StepEditorProps) {
  const updateStepField = useAppStore((s) => s.updateStepField);
  const deleteStep = useAppStore((s) => s.deleteStep);

  const isDev = step.name === "DEV";
  const isTempControlled = step.compensation !== "Off";

  return (
    <div className={`rounded-2xl border p-3 transition-colors ${
      isDev
        ? "bg-(--color-accent)/8 border-(--color-accent)/35"
        : "bg-(--color-surface) border-(--color-border)"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <button
          {...dragHandleProps}
          className="w-8 h-8 rounded-lg border border-(--color-border) bg-(--color-surface-secondary) cursor-grab active:cursor-grabbing text-(--color-text-tertiary) hover:text-(--color-text-secondary) hover:bg-(--color-surface-hover) touch-none transition-colors flex items-center justify-center"
          title="Drag step"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
          </svg>
        </button>

        <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
          isDev
            ? "bg-(--color-accent)/20 text-(--color-accent) border-(--color-accent)/40"
            : "bg-(--color-surface-secondary) text-(--color-text-secondary) border-(--color-border)"
        }`}>
          {step.name}
        </span>

        <div className="flex-1" />

        <button
          onClick={() => deleteStep(recipe.id, step.id)}
          className="w-7 h-7 rounded-full border border-(--color-danger) text-(--color-danger) hover:bg-(--color-danger)/12 transition-colors flex items-center justify-center"
          title="Remove step"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="hidden md:grid grid-cols-4 gap-2 mb-2 px-1">
        {["STEP", "TIME", "AGITATION", "TIME CONTROL"].map((label) => (
          <p
            key={label}
            className="text-[11px] font-semibold tracking-wide text-(--color-text-tertiary) text-center"
          >
            {label}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-secondary) p-3">
          <p className="md:hidden mb-1 text-[11px] uppercase tracking-wide text-(--color-text-tertiary)">Step</p>
          <input
            type="text"
            value={step.name}
            maxLength={5}
            onChange={(e) => updateStepField(step.id, "name", e.target.value.toUpperCase())}
            className="w-full text-center text-lg font-semibold tracking-wide bg-transparent border-none outline-none text-(--color-text-primary)"
          />
        </div>

        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-secondary) p-3">
          <p className="md:hidden mb-1 text-[11px] uppercase tracking-wide text-(--color-text-tertiary)">Time</p>
          <div className="flex items-center justify-center gap-1">
            <input
              type="number"
              min={0}
              max={99}
              value={step.time_min}
              onChange={(e) =>
                updateStepField(
                  step.id,
                  "time_min",
                  Math.max(0, Math.min(99, parseInt(e.target.value, 10) || 0))
                )
              }
              className="w-14 text-center font-mono tabular-nums text-3xl bg-transparent border-none outline-none text-(--color-text-primary)"
            />
            <span className="text-(--color-text-secondary) font-mono text-3xl">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={step.time_sec}
              onChange={(e) =>
                updateStepField(
                  step.id,
                  "time_sec",
                  Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0))
                )
              }
              className="w-14 text-center font-mono tabular-nums text-3xl bg-transparent border-none outline-none text-(--color-text-primary)"
            />
          </div>
        </div>

        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-secondary) p-3">
          <p className="md:hidden mb-1 text-[11px] uppercase tracking-wide text-(--color-text-tertiary)">Agitation</p>
          <select
            value={step.agitation}
            onChange={(e) => updateStepField(step.id, "agitation", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent) text-center"
          >
            {AGITATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-secondary) p-3">
          <p className="md:hidden mb-1 text-[11px] uppercase tracking-wide text-(--color-text-tertiary)">Time Control</p>
          <select
            value={step.compensation}
            onChange={(e) => updateStepField(step.id, "compensation", e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-(--color-surface) border border-(--color-border) text-(--color-text-primary) outline-none focus:border-(--color-accent)"
          >
            {COMPENSATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            <input
              type="number"
              value={step.min_temperature}
              onChange={(e) => updateStepField(step.id, "min_temperature", parseFloat(e.target.value) || 0)}
              className="w-full text-center font-mono tabular-nums px-1.5 py-1.5 rounded-md bg-(--color-surface) border border-(--color-border) outline-none focus:border-(--color-accent)"
              title="Min"
              disabled={!isTempControlled}
            />
            <input
              type="number"
              value={step.rated_temperature}
              onChange={(e) => updateStepField(step.id, "rated_temperature", parseFloat(e.target.value) || 0)}
              className="w-full text-center font-mono tabular-nums px-1.5 py-1.5 rounded-md bg-(--color-surface) border border-(--color-border) outline-none focus:border-(--color-accent) font-semibold"
              title="Rated"
              disabled={!isTempControlled}
            />
            <input
              type="number"
              value={step.max_temperature}
              onChange={(e) => updateStepField(step.id, "max_temperature", parseFloat(e.target.value) || 0)}
              className="w-full text-center font-mono tabular-nums px-1.5 py-1.5 rounded-md bg-(--color-surface) border border-(--color-border) outline-none focus:border-(--color-accent)"
              title="Max"
              disabled={!isTempControlled}
            />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {isDev && (
              <input
                type="text"
                value={step.formula_designator}
                onChange={(e) => updateStepField(step.id, "formula_designator", e.target.value)}
                className="w-full px-2 py-1.5 rounded-md bg-(--color-surface) border border-(--color-border) outline-none focus:border-(--color-accent) text-xs"
                placeholder="1.1.1"
              />
            )}
            <input
              type="text"
              value={step.logo_text}
              onChange={(e) => updateStepField(step.id, "logo_text", e.target.value)}
              className={`w-full px-2 py-1.5 rounded-md bg-(--color-surface) border border-(--color-border) outline-none focus:border-(--color-accent) text-xs ${
                isDev ? "" : "col-span-2"
              }`}
              placeholder="Optional"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
