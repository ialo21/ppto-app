import React, { useEffect, useRef, useState } from "react";

type YearOption = { value: string; label: string };

interface YearMultiSelectProps {
  label?: string;
  placeholder?: string;
  options: YearOption[];
  selectedYears: string[];
  onChange: (selected: string[]) => void;
}

/**
 * YearMultiSelect - Selector múltiple de años con checkboxes
 * Inspirado en StatusMultiSelect (UI y UX similares)
 */
export default function YearMultiSelect({
  label,
  placeholder = "Todos los años",
  options,
  selectedYears,
  onChange
}: YearMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (value: string) => {
    if (selectedYears.includes(value)) {
      onChange(selectedYears.filter((y) => y !== value));
    } else {
      onChange([...selectedYears, value]);
    }
  };

  const handleSelectAll = () => {
    const onlyValues = options
      .map((o) => o.value)
      .filter((v) => v !== "");
    onChange(onlyValues);
  };

  const handleClear = () => onChange([]);

  const displayText = () => {
    if (selectedYears.length === 0) return placeholder;
    const nonEmpty = selectedYears.filter((y) => y !== "");
    if (nonEmpty.length === options.filter((o) => o.value !== "").length) return "Todos";
    if (nonEmpty.length === 1) return nonEmpty[0];
    return `${nonEmpty.length} años`;
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs text-brand-text-secondary font-medium mb-1">
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-full flex items-center justify-between gap-2 px-3 text-left border border-brand-border dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-xs sm:text-sm dark:text-gray-200 transition-all duration-200 hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
      >
        <span className={`block truncate ${selectedYears.length === 0 ? "text-brand-text-disabled" : "text-brand-text-primary"}`}>
          {displayText()}
        </span>
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-brand-border dark:border-slate-600 rounded-xl shadow-lg max-h-80 overflow-hidden"
        >
          <div className="p-2 border-b border-brand-border dark:border-slate-700 flex gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex-1 px-2 py-1 text-xs bg-brand-primary text-white rounded hover:bg-brand-primary/90"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
            >
              Limpiar
            </button>
          </div>

          <div className="p-1 overflow-y-auto max-h-60">
            {options
              .filter((o) => o.value !== "")
              .map((option) => {
                const isSelected = selectedYears.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleToggle(option.value)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <div
                      className={`w-4 h-4 border rounded flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-brand-primary border-brand-primary" : "border-brand-border"
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="none">
                          <path
                            d="M6 10.5l2.5 2.5L14 7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="flex-1 truncate">{option.label}</span>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
