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

      {/* Size list */}
      <div className="flex flex-wrap gap-x-2 gap-y-1 sm:gap-x-4">
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
              className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-3 text-base tracking-[0.15em] uppercase transition-colors duration-200
                after:absolute after:bottom-1.5 after:left-3 after:right-3 after:h-[1.5px]
                after:origin-left after:scale-x-0 after:transition-transform after:duration-300 after:ease-out
                ${
                  isSelected
                    ? 'text-[var(--accent)] font-medium after:scale-x-100 after:bg-[var(--accent)]'
                    : size.available
                      ? 'text-[var(--ink)] hover:text-[var(--accent)] after:bg-[var(--accent)] hover:after:scale-x-100'
                      : 'text-[var(--ink)]/20 cursor-not-allowed line-through'
                }
              `}
            >
              {size.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
