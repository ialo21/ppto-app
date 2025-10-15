import React, { useState, useRef, useEffect } from "react";

const INVOICE_STATUSES = [
  { value: "INGRESADO", label: "Ingresado", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
  { value: "EN_APROBACION", label: "En Aprobación", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "EN_CONTABILIDAD", label: "En Contabilidad", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "EN_TESORERIA", label: "En Tesorería", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  { value: "EN_ESPERA_DE_PAGO", label: "En Espera de Pago", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  { value: "PAGADO", label: "Pagado", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  { value: "RECHAZADO", label: "Rechazado", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" }
];

interface StatusChipProps {
  currentStatus: string;
  onStatusChange: (newStatus: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function StatusChip({ currentStatus, onStatusChange, isLoading = false, disabled = false }: StatusChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentStatusConfig = INVOICE_STATUSES.find(s => s.value === currentStatus) || INVOICE_STATUSES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleStatusSelect = (status: string) => {
    if (status !== currentStatus) {
      onStatusChange(status);
    }
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || isLoading}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          px-3 py-1 text-xs font-medium rounded-full cursor-pointer
          transition-all duration-150
          ${currentStatusConfig.color}
          ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
          relative
        `}
      >
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
        )}
        <span className={isLoading ? 'invisible' : ''}>
          {currentStatusConfig.label}
        </span>
      </button>

      {isOpen && !isLoading && (
        <div className="absolute z-50 mt-2 w-56 rounded-lg shadow-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1">
          {INVOICE_STATUSES.map((status) => (
            <button
              key={status.value}
              type="button"
              onClick={() => handleStatusSelect(status.value)}
              className={`
                w-full px-4 py-2 text-left text-sm
                hover:bg-slate-100 dark:hover:bg-slate-700
                transition-colors duration-150
                flex items-center justify-between
                ${status.value === currentStatus ? 'bg-slate-50 dark:bg-slate-750' : ''}
              `}
            >
              <span className={`px-2 py-0.5 text-xs rounded-full ${status.color}`}>
                {status.label}
              </span>
              {status.value === currentStatus && (
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

