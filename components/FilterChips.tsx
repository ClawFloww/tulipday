"use client";

interface FilterChipsProps {
  chips:    string[];
  active:   string;
  onChange: (chip: string) => void;
}

export function FilterChips({ chips, active, onChange }: FilterChipsProps) {
  return (
    <div
      className="flex gap-2"
      style={{
        overflowX: "auto",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
        paddingBottom: 2,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Hide webkit scrollbar via inline pseudo — handled by globals.css scrollbar-hide */}
      {chips.map((chip) => {
        const isActive = chip === active;
        return (
          <button
            key={chip}
            onClick={() => onChange(chip)}
            style={{
              flexShrink: 0,
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1,
              padding: "7px 14px",
              borderRadius: 999,
              border: isActive ? "1.5px solid #97C459" : "1.5px solid #E5E7EB",
              backgroundColor: isActive ? "#EAF3DE" : "transparent",
              color: isActive ? "#27500A" : "#6B7280",
              transition: "all 150ms ease",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
}
