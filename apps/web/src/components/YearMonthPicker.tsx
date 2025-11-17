import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/ui";
import { formatPeriodLabel } from "../utils/periodFormat";

const MONTH_ABBREV_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

interface Period {
  id: number;
  year: number;
  month: number;
}

interface YearMonthPickerProps {
  value?: number | null; // periodId
  onChange: (period: Period | null) => void;
  periods: Period[];
  minId?: number;
  maxId?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
  clearable?: boolean; // Mostrar botón de limpiar (default: true)
}

export default function YearMonthPicker({
  value,
  onChange,
  periods,
  minId,
  maxId,
  disabled = false,
  placeholder = "Seleccione período...",
  className,
  error,
  clearable = true
}: YearMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const focusedButtonRef = useRef<HTMLButtonElement>(null);

  // Ordenar períodos por año y mes
  const sortedPeriods = useMemo(() => {
    return [...periods].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [periods]);

  // Años disponibles ordenados
  const availableYears = useMemo(() => {
    const years = Array.from(new Set(sortedPeriods.map(p => p.year))).sort((a, b) => b - a);
    return years;
  }, [sortedPeriods]);

  // Agrupar por año
  const periodsByYear = useMemo(() => {
    const groups: Record<number, Period[]> = {};
    sortedPeriods.forEach(p => {
      if (!groups[p.year]) groups[p.year] = [];
      groups[p.year].push(p);
    });
    return groups;
  }, [sortedPeriods]);

  // Encontrar período seleccionado
  const selectedPeriod = useMemo(() => {
    return value ? sortedPeriods.find(p => p.id === value) : null;
  }, [value, sortedPeriods]);

  // Establecer año inicial cuando se abre
  useEffect(() => {
    if (isOpen && !selectedYear) {
      if (selectedPeriod) {
        // Si ya hay un valor seleccionado, respetar ese año
        setSelectedYear(selectedPeriod.year);
      } else if (availableYears.length > 0) {
        // Si no hay valor, anclar al año actual (o el más cercano disponible)
        const currentYear = new Date().getFullYear();
        const closestYear = availableYears.reduce((prev, curr) => 
          Math.abs(curr - currentYear) < Math.abs(prev - currentYear) ? curr : prev
        );
        setSelectedYear(closestYear);
      }
    }
  }, [isOpen, selectedYear, selectedPeriod, availableYears]);

  // Filtrar períodos por búsqueda
  const filteredPeriods = useMemo(() => {
    if (!search.trim()) return sortedPeriods;
    
    const searchLower = search.toLowerCase().replace(/\s+/g, "");
    return sortedPeriods.filter(p => {
      const label = formatPeriodLabel(p).toLowerCase().replace(/\s+/g, "");
      const monthName = MONTH_ABBREV_ES[p.month - 1];
      const yearStr = String(p.year);
      
      return (
        label.includes(searchLower) ||
        monthName.includes(searchLower) ||
        yearStr.includes(searchLower)
      );
    });
  }, [search, sortedPeriods]);

  // Verificar si un período está deshabilitado
  const isPeriodDisabled = (period: Period) => {
    // Comparar por fecha cronológica (año-mes), no por ID
    if (minId !== undefined) {
      const minPeriod = sortedPeriods.find(p => p.id === minId);
      if (minPeriod) {
        const periodValue = period.year * 100 + period.month;
        const minValue = minPeriod.year * 100 + minPeriod.month;
        if (periodValue < minValue) return true;
      }
    }
    if (maxId !== undefined) {
      const maxPeriod = sortedPeriods.find(p => p.id === maxId);
      if (maxPeriod) {
        const periodValue = period.year * 100 + period.month;
        const maxValue = maxPeriod.year * 100 + maxPeriod.month;
        if (periodValue > maxValue) return true;
      }
    }
    return false;
  };

  // Calcular posición del dropdown
  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 320)
      });
    }
  };

  // Manejar clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !containerRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
        setSelectedYear(null);
      }
    };

    if (isOpen) {
      updateDropdownPosition();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updateDropdownPosition);
      window.addEventListener("scroll", updateDropdownPosition, true);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", updateDropdownPosition);
        window.removeEventListener("scroll", updateDropdownPosition, true);
      };
    }
  }, [isOpen]);

  // Auto-scroll al elemento enfocado
  useEffect(() => {
    if (isOpen && focusedButtonRef.current) {
      focusedButtonRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [focusedIndex, isOpen]);

  // Manejar teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "Backspace":
      case "Delete":
        // Si clearable=false y el dropdown está cerrado, prevenir borrado
        if (!clearable && !isOpen && selectedPeriod) {
          e.preventDefault();
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setSearch("");
        inputRef.current?.blur();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => Math.min(prev + 1, filteredPeriods.length - 1));
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (isOpen && filteredPeriods.length > 0) {
          const period = filteredPeriods[focusedIndex];
          if (period && !isPeriodDisabled(period)) {
            handleSelect(period);
          }
        } else {
          setIsOpen(true);
        }
        break;
    }
  };

  const handleSelect = (period: Period) => {
    if (isPeriodDisabled(period)) return;
    onChange(period);
    setIsOpen(false);
    setSearch("");
    setFocusedIndex(0);
    setSelectedYear(null);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch("");
    inputRef.current?.focus();
  };

  const handlePrevYear = () => {
    if (!selectedYear) return;
    const currentIndex = availableYears.indexOf(selectedYear);
    if (currentIndex < availableYears.length - 1) {
      setSelectedYear(availableYears[currentIndex + 1]);
    }
  };

  const handleNextYear = () => {
    if (!selectedYear) return;
    const currentIndex = availableYears.indexOf(selectedYear);
    if (currentIndex > 0) {
      setSelectedYear(availableYears[currentIndex - 1]);
    }
  };

  const handleOpenDropdown = () => {
    if (!disabled) {
      setIsOpen(true);
      updateDropdownPosition();
    }
  };

  // Períodos del año seleccionado
  const yearPeriods = useMemo(() => {
    if (!selectedYear) return [];
    return periodsByYear[selectedYear] || [];
  }, [selectedYear, periodsByYear]);

  // Renderizar dropdown con portal
  const renderDropdown = () => {
    if (!isOpen || disabled) return null;

    return createPortal(
      <div
        ref={dropdownRef}
        className="fixed z-50 bg-slate-800/95 backdrop-blur-sm border border-slate-700/60 rounded-md shadow-xl min-w-[320px]"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`
        }}
        role="listbox"
      >
        {/* Header con navegación de años */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50 bg-slate-800/90">
          <button
            type="button"
            onClick={handlePrevYear}
            disabled={!selectedYear || availableYears.indexOf(selectedYear) >= availableYears.length - 1}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Año anterior"
          >
            <ChevronLeft className="h-4 w-4 text-slate-100" />
          </button>
          <div className="text-sm font-semibold text-slate-100">
            {selectedYear || "Seleccione año"}
          </div>
          <button
            type="button"
            onClick={handleNextYear}
            disabled={!selectedYear || availableYears.indexOf(selectedYear) <= 0}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Año siguiente"
          >
            <ChevronRight className="h-4 w-4 text-slate-100" />
          </button>
        </div>

        {/* Grid de meses 3x4 */}
        <div className="p-3">
          {yearPeriods.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-400">
              No hay períodos disponibles para {selectedYear}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {MONTH_ABBREV_ES.map((monthAbbrev, index) => {
                const month = index + 1;
                const period = yearPeriods.find(p => p.month === month);
                const isDisabled = !period || isPeriodDisabled(period);
                const isSelected = period && value === period.id;
                const isCurrent = new Date().getFullYear() === selectedYear && new Date().getMonth() + 1 === month;

                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => period && handleSelect(period)}
                    disabled={isDisabled}
                    className={cn(
                      "px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-slate-400",
                      isSelected && "bg-brand-500 text-white shadow-md",
                      !isSelected && !isDisabled && "bg-slate-700/50 text-slate-100 hover:bg-slate-700 hover:shadow-md",
                      isDisabled && "bg-slate-800/30 text-slate-600 cursor-not-allowed opacity-50",
                      isCurrent && !isSelected && "ring-1 ring-slate-500"
                    )}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={isDisabled}
                  >
                    <div className="capitalize">{monthAbbrev}</div>
                    {isCurrent && !isSelected && (
                      <div className="text-[10px] mt-0.5 text-slate-400">actual</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input trigger */}
      <div
        className={cn(
          "relative flex items-center h-10 w-full rounded-xl border bg-white dark:bg-slate-900 px-3 cursor-text",
          "outline-none transition-colors dark:border-slate-700",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50",
          error 
            ? "border-red-500 focus-within:ring-2 focus-within:ring-red-500" 
            : "border-slate-300 dark:border-slate-700 focus-within:ring-2 focus-within:ring-brand-500"
        )}
        onClick={handleOpenDropdown}
      >
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : (selectedPeriod ? formatPeriodLabel(selectedPeriod) : "")}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={handleOpenDropdown}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none text-sm dark:text-slate-100 disabled:cursor-not-allowed placeholder:text-slate-400"
          aria-label="Búsqueda de período"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        <div className="flex items-center gap-1">
          {clearable && selectedPeriod && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
              aria-label="Limpiar selección"
            >
              <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </button>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform",
              isOpen && "transform rotate-180"
            )}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}

      {/* Dropdown renderizado con portal */}
      {renderDropdown()}
    </div>
  );
}

