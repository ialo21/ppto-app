import React, { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

export interface ProviderOption {
  value: string;
  label: string;
  secondary?: string | null;
}

interface ProviderMultiSelectProps {
  providers: ProviderOption[];
  selectedProviders: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  placeholder?: string;
}

export default function ProviderMultiSelect({
  providers,
  selectedProviders,
  onChange,
  label = "Proveedores",
  placeholder = "Todos los proveedores"
}: ProviderMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleProvider = (value: string) => {
    if (selectedProviders.includes(value)) {
      onChange(selectedProviders.filter(p => p !== value));
    } else {
      onChange([...selectedProviders, value]);
    }
  };

  const selectAll = () => onChange(providers.map(p => p.value));
  const clearAll = () => onChange([]);

  const filteredProviders = providers.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      p.label.toLowerCase().includes(term) ||
      (p.secondary?.toLowerCase().includes(term) ?? false) ||
      p.value.toLowerCase().includes(term)
    );
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs text-brand-text-secondary font-medium mb-1">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-full px-3 text-left border border-brand-border rounded-xl bg-white text-xs sm:text-sm flex items-center justify-between gap-2 transition-all duration-200 hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
      >
        <span className={selectedProviders.length === 0 ? "text-brand-text-disabled" : "text-brand-text-primary"}>
          {selectedProviders.length === 0
            ? placeholder
            : selectedProviders.length === 1
              ? (() => {
                  const selected = providers.find(p => p.value === selectedProviders[0]);
                  return selected ? selected.label : selectedProviders[0];
                })()
              : `${selectedProviders.length} proveedores seleccionados`}
        </span>
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-brand-border rounded-xl shadow-lg max-h-72 overflow-hidden">
          <div className="sticky top-0 bg-white border-b border-brand-border p-2 flex flex-col gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nombre o RUC"
              className="h-9 w-full px-3 text-sm border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="flex-1 px-2 py-1 text-xs bg-brand-primary text-white rounded hover:bg-brand-primary/90"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="flex-1 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
              >
                Limpiar
              </button>
            </div>
          </div>

          {filteredProviders.length === 0 ? (
            <div className="p-3 text-sm text-brand-text-disabled text-center">
              No hay proveedores
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto pb-3 pr-1">
              {filteredProviders.map((provider) => {
                const isSelected = selectedProviders.includes(provider.value);
                return (
                  <button
                    key={provider.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleProvider(provider.value)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-brand-background cursor-pointer"
                  >
                    <div
                      className={`
                        w-4 h-4 border rounded flex items-center justify-center flex-shrink-0
                        ${isSelected ? 'bg-brand-primary border-brand-primary' : 'border-brand-border bg-white'}
                      `}
                    >
                      {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-brand-text-primary font-medium block truncate" title={provider.label}>
                        {provider.label}
                      </span>
                      {provider.secondary && (
                        <span className="text-xs text-brand-text-disabled block truncate" title={provider.secondary}>
                          {provider.secondary}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
