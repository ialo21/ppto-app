import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "../../lib/ui";

export interface FilterOption {
  value: string;
  label: string;
  searchText?: string; // Texto adicional para búsqueda (ej: código)
}

interface FilterSelectProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  emptyText?: string;
}

/**
 * FilterSelect - Dropdown moderno y accesible para filtros
 * 
 * Características:
 * - Búsqueda integrada (opcional)
 * - Navegación con teclado
 * - Click fuera para cerrar
 * - Diseño consistente con el resto de la app
 * - Optimizado para listas largas
 */
export default function FilterSelect({
  label,
  placeholder = "Seleccionar...",
  value,
  onChange,
  options,
  disabled = false,
  className,
  searchable = true,
  emptyText = "Sin opciones disponibles"
}: FilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calcular posición del dropdown
  // IMPORTANTE: Con position: fixed, usamos coordenadas relativas al viewport (sin scroll)
  // getBoundingClientRect() ya devuelve posición relativa al viewport
  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,  // ✅ Solo viewport (sin window.scrollY)
        left: rect.left,       // ✅ Solo viewport (sin window.scrollX)
        width: rect.width
      });
    }
  };

  // Cerrar dropdown al hacer click fuera y manejar posicionamiento
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Verificar si el click fue fuera tanto del contenedor como del dropdown portal
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
      // Enfocar input de búsqueda al abrir
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

  // Encontrar la opción seleccionada
  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label || placeholder;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setSearchTerm("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
    }
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
          !selectedOption && "text-brand-text-disabled"
        )}
      >
        <span className="truncate flex-1">{displayText}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedOption && !disabled && (
            <X
              size={14}
              className="text-brand-text-secondary hover:text-brand-text-primary transition-colors cursor-pointer"
              onClick={handleClear}
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

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-brand-text-disabled">
                {searchTerm ? "No se encontraron resultados" : emptyText}
              </div>
            ) : (
              <>
                {/* Opción vacía/todos */}
                {!searchTerm && (
                  <button
                    type="button"
                    onClick={() => handleSelect("")}
                    className={cn(
                      "w-full px-3 py-2 text-left text-xs sm:text-sm",
                      "hover:bg-brand-background transition-colors",
                      "border-b border-brand-border-light",
                      !value && "bg-brand-primary/5 text-brand-primary font-medium"
                    )}
                  >
                    {placeholder}
                  </button>
                )}
                
                {filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "w-full px-3 py-2 text-left text-xs sm:text-sm",
                      "hover:bg-brand-background transition-colors",
                      "border-b border-brand-border-light last:border-b-0",
                      value === option.value &&
                        "bg-brand-primary/5 text-brand-primary font-medium"
                    )}
                  >
                    <div className="truncate">{option.label}</div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
