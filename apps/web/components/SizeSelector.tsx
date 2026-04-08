'use client';

export interface SizeOption {
  label: string;
  available: boolean;
}

interface SizeSelectorProps {
  sizes: SizeOption[];
  selected: string | null;
  onSelect: (size: string) => void;
  sizeGuideLabel: string;
  selectSizeLabel: string;
  unavailableLabel: string;
  onSizeGuideClick?: () => void;
}

export default function SizeSelector({
  sizes,
  selected,
  onSelect,
  sizeGuideLabel,
  selectSizeLabel,
  unavailableLabel,
  onSizeGuideClick,
}: SizeSelectorProps) {
  return (
    <div>
      {/* Header */}
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-medium text-[var(--ink)]">
          {selectSizeLabel}
        </p>
        <button
          type="button"
          onClick={onSizeGuideClick}
          className="text-sm text-[var(--ink-soft)] underline underline-offset-2 transition hover:text-[var(--accent)]"
        >
          {sizeGuideLabel}
        </button>
      </div>

      {/* Size grid */}
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-4">
        {sizes.map((size) => {
          const isSelected = selected === size.label;
          return (
            <button
              key={size.label}
              onClick={() => size.available && onSelect(size.label)}
              disabled={!size.available}
              aria-disabled={!size.available}
              aria-pressed={isSelected}
              aria-label={!size.available ? `${size.label} — ${unavailableLabel}` : size.label}
              className={`relative flex h-12 items-center justify-center rounded-lg border text-sm font-medium transition-all duration-150
                ${
                  isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : size.available
                      ? 'border-[var(--ink)]/15 text-[var(--ink)] hover:border-[var(--ink)]/40'
                      : 'border-dashed border-[var(--ink)]/10 bg-[var(--ink)]/[0.02] text-[var(--ink)]/15 cursor-not-allowed'
                }
              `}
            >
              <span className={!size.available ? 'opacity-30 line-through decoration-[var(--ink)]/30' : ''}>{size.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
