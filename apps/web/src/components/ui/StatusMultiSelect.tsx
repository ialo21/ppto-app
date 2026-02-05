import React, { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";

interface StatusMultiSelectProps {
  label?: string;
  placeholder?: string;
  statuses: string[];  // Lista de estados disponibles (ej: ["PENDIENTE", "APROBADO", "ATENDIDO"])
  selectedStatuses: string[];
  onChange: (selected: string[]) => void;
  excludeStatus?: string;  // Estado a excluir en "Todo menos X" (ej: "ATENDIDO" o "PAGADO")
  excludeLabel?: string;  // Label para el botón "Todo menos X" (ej: "Todo menos Atendido")
}

/**
 * StatusMultiSelect - Componente para selección múltiple de estados con checkboxes
 * 
 * Características:
 * - Multi-selección con checkboxes
 * - Opción "Todo menos X" para seleccionar todos excepto uno
 * - Botones "Seleccionar Todo" y "Limpiar"
 * - Diseño consistente con UserMultiSelect
 */
export default function StatusMultiSelect({
  label,
  placeholder = "Todos los estados",
  statuses,
  selectedStatuses,
  onChange,
  excludeStatus,
  excludeLabel = "Todo menos..."
}: StatusMultiSelectProps) {
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

  const handleToggle = (status: string) => {
    if (selectedStatuses.includes(status)) {
      onChange(selectedStatuses.filter(s => s !== status));
    } else {
      onChange([...selectedStatuses, status]);
    }
  };

  const handleSelectAll = () => {
    onChange([...statuses]);
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleExclude = () => {
    if (!excludeStatus) return;
    onChange(statuses.filter(s => s !== excludeStatus));
  };

  const getDisplayText = () => {
    if (selectedStatuses.length === 0) return placeholder;
    if (selectedStatuses.length === statuses.length) return "Todos";
    if (selectedStatuses.length === 1) return selectedStatuses[0];
    
    // Verificar si es "Todo menos X"
    if (excludeStatus && selectedStatuses.length === statuses.length - 1) {
      const missing = statuses.find(s => !selectedStatuses.includes(s));
      if (missing === excludeStatus) {
        return excludeLabel;
      }
    }
    
    return `${selectedStatuses.length} estados`;
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-xs text-brand-text-secondary font-medium mb-1">
          {label}
        </label>
      )}
      
      {/* Botón principal */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-full flex items-center justify-between gap-2 px-3 text-left border border-brand-border dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-xs sm:text-sm dark:text-gray-200 transition-all duration-200 hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
      >
        <div className="flex-1 min-w-0">
          <span className={`block truncate ${selectedStatuses.length === 0 ? "text-brand-text-disabled" : "text-brand-text-primary"}`}>
            {getDisplayText()}
          </span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-brand-border dark:border-slate-600 rounded-xl shadow-lg max-h-80 overflow-hidden"
        >
          {/* Acciones rápidas */}
          <div className="p-2 border-b border-brand-border dark:border-slate-700 flex flex-col gap-2">
            <div className="flex gap-2">
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
            {excludeStatus && (
              <button
                type="button"
                onClick={handleExclude}
                className="w-full px-2 py-1 text-xs bg-brand-primary text-white rounded hover:bg-brand-primary/90"
              >
                {excludeLabel?.trim() || `Todo menos ${excludeStatus}`}
              </button>
            )}
          </div>

          {/* Lista de estados */}
          <div className="max-h-60 overflow-y-auto pb-3 pr-1">
            {statuses.map((status) => {
              const isSelected = selectedStatuses.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleToggle(status)}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-brand-background dark:hover:bg-slate-700 cursor-pointer"
                >
                  <div
                    className={`
                      w-4 h-4 border rounded flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'bg-brand-primary border-brand-primary' : 'border-brand-border dark:border-slate-600 bg-white dark:bg-slate-700'}
                    `}
                  >
                    {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-brand-text-primary dark:text-gray-200 font-medium block truncate">
                      {status}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
