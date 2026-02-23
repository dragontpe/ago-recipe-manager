import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useAppStore } from "../lib/store";
import { StepEditor } from "./StepEditor";
import type { Recipe, Step } from "../lib/types";
import { STEP_NAMES } from "../lib/constants";

function SortableStep({ step, recipe }: { step: Step; recipe: Recipe }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging}
      className="mb-2"
    >
      <StepEditor
        step={step}
        recipe={recipe}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function StepList({ recipe }: { recipe: Recipe }) {
  const reorderSteps = useAppStore((s) => s.reorderSteps);
  const addStep = useAppStore((s) => s.addStep);

  const steps = [...recipe.steps].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const stepIds = steps.map((s) => s.id);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stepIds.indexOf(active.id as string);
    const newIndex = stepIds.indexOf(over.id as string);
    reorderSteps(recipe.id, oldIndex, newIndex);
  };

  return (
    <div>
      <div className="mb-3 rounded-2xl border border-(--color-border) bg-(--color-surface) px-4 py-2">
        <p className="text-xs font-semibold tracking-[0.12em] uppercase text-(--color-text-tertiary)">
          Program Steps
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={stepIds} strategy={verticalListSortingStrategy}>
          {steps.map((step) => (
            <SortableStep key={step.id} step={step} recipe={recipe} />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add step */}
      <div className="flex flex-wrap gap-2 mt-3">
        {STEP_NAMES.map((name) => (
          <button
            key={name}
            onClick={() => addStep(recipe.id, name)}
            className="px-3 py-1.5 text-xs rounded-full border border-(--color-border) text-(--color-text-secondary) hover:border-(--color-accent) hover:text-(--color-accent) transition-colors"
          >
            + {name}
          </button>
        ))}
      </div>
    </div>
  );
}
