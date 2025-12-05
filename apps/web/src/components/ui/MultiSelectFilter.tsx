import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "../../lib/ui";

export interface MultiSelectOption {
  value: string;
  label: string;
  searchText?: string;
}

interface MultiSelectFilterProps {
  label?: string;
  placeholder?: string;
  values: string[]; // Array de valores seleccionados
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  emptyText?: string;
  maxDisplayItems?: number; // Cantidad máxima de items a mostrar en el trigger antes de resumir
}

/**
 * MultiSelectFilter - Dropdown moderno para selección múltiple
 * 
 * Características:
 * - Selección múltiple con checkboxes
 * - Búsqueda integrada
 * - Muestra chips de elementos seleccionados o resumen
 * - Navegación con teclado
 * - Diseño consistente con FilterSelect
 */
export default function MultiSelectFilter({
  label,
  placeholder = "Seleccionar...",
  values,
  onChange,
  options,
  disabled = false,
  className,
  searchable = true,
  emptyText = "Sin opciones disponibles",
  maxDisplayItems = 3
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calcular posición del dropdown
  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    if (isOpen) {
      updateDropdownPosition();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  // Filtrar opciones basado en búsqueda
  const filteredOptions = searchTerm
    ? options.filter((option) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          option.label.toLowerCase().includes(searchLower) ||
          option.value.toLowerCase().includes(searchLower) ||
          option.searchText?.toLowerCase().includes(searchLower)
        );
      })
    : options;

  // Toggle selección de una opción
  const handleToggle = (optionValue: string) => {
    if (values.includes(optionValue)) {
      onChange(values.filter(v => v !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
  };

  // Limpiar todas las selecciones
  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    }
  };

  // Texto a mostrar en el trigger
  const getDisplayText = () => {
    if (values.length === 0) {
      return placeholder;
    }
    
    if (values.length <= maxDisplayItems) {
      return values
        .map(v => options.find(opt => opt.value === v)?.label || v)
        .join(", ");
    }
    
    return `${values.length} seleccionado${values.length > 1 ? 's' : ''}`;
  };

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      {label && (
        <label className="block text-xs text-brand-text-secondary font-medium mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "h-9 w-full rounded-xl border bg-white px-3 text-left",
          "flex items-center justify-between gap-2",
          "transition-all duration-200",
          "text-xs sm:text-sm",
          disabled
            ? "opacity-50 cursor-not-allowed bg-gray-50"
            : "hover:border-brand-primary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary",
          isOpen
            ? "border-brand-primary ring-2 ring-brand-primary"
            : "border-brand-border",
          values.length === 0 && "text-brand-text-disabled"
        )}
      >
        <span className="truncate flex-1">{getDisplayText()}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {values.length > 0 && !disabled && (
            <X
              size={14}
              className="text-brand-text-secondary hover:text-brand-text-primary transition-colors cursor-pointer"
              onClick={handleClearAll}
            />
          )}
          <ChevronDown
            size={16}
            className={cn(
              "text-brand-text-secondary transition-transform duration-200",
              isOpen && "transform rotate-180"
            )}
          />
        </div>
      </button>

      {/* Dropdown Portal */}
      {isOpen && !disabled && createPortal(
        <div
          ref={dropdownRef}
          className={cn(
            "fixed z-[9999]",
            "bg-white rounded-xl border border-brand-border shadow-lg",
            "overflow-hidden"
          )}
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          {searchable && options.length > 5 && (
            <div className="p-2 border-b border-brand-border-light">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-text-disabled"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-brand-border-light focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Options List with Checkboxes */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-brand-text-disabled">
                {searchTerm ? "No se encontraron resultados" : emptyText}
              </div>
            ) : (
              <>
                {filteredOptions.map((option) => {
                  const isSelected = values.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggle(option.value)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-xs sm:text-sm",
                        "hover:bg-brand-background transition-colors",
                        "border-b border-brand-border-light last:border-b-0",
                        "flex items-center gap-2",
                        isSelected && "bg-brand-primary/5"
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                          isSelected
                            ? "bg-brand-primary border-brand-primary"
                            : "border-brand-border bg-white"
                        )}
                      >
                        {isSelected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className={cn("truncate flex-1", isSelected && "text-brand-primary font-medium")}>
                        {option.label}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
