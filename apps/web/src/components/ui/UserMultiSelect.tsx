import React, { useState, useRef, useEffect } from "react";
import { Check } from "lucide-react";

export interface UserOption {
  email: string;
  name?: string | null;
}

interface UserMultiSelectProps {
  users: UserOption[];  // Lista de usuarios con nombre y email
  selectedUsers: string[];  // Array de emails seleccionados
  onChange: (selected: string[]) => void;
  label?: string;
  placeholder?: string;
}

export default function UserMultiSelect({
  users,
  selectedUsers,
  onChange,
  label = "Usuarios",
  placeholder = "Seleccionar usuarios..."
}: UserMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const toggleUser = (email: string) => {
    if (selectedUsers.includes(email)) {
      onChange(selectedUsers.filter(u => u !== email));
    } else {
      onChange([...selectedUsers, email]);
    }
  };

  const selectAll = () => {
    onChange(users.map(u => u.email));
  };

  const clearAll = () => {
    onChange([]);
  };

  // Helper para obtener el nombre a mostrar
  const getDisplayName = (user: UserOption) => {
    if (user.name) {
      return user.name;
    }
    return user.email;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-xs text-brand-text-secondary font-medium mb-1">
          {label}
        </label>
      )}
      
      {/* Botón principal */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-9 w-full px-3 text-left border border-brand-border rounded-xl bg-white text-xs sm:text-sm flex items-center justify-between gap-2 transition-all duration-200 hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
      >
        <span className={selectedUsers.length === 0 ? "text-brand-text-disabled" : "text-brand-text-primary truncate"}>
          {selectedUsers.length === 0 ? (
            placeholder
          ) : selectedUsers.length === 1 ? (
            // Mostrar nombre del único usuario seleccionado
            (() => {
              const user = users.find(u => u.email === selectedUsers[0]);
              return user ? getDisplayName(user) : selectedUsers[0];
            })()
          ) : (
            // Mostrar contador para múltiples usuarios
            `${selectedUsers.length} usuarios seleccionados`
          )}
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-brand-border rounded-xl shadow-lg max-h-60 overflow-hidden">
          {/* Acciones rápidas */}
          <div className="sticky top-0 bg-white border-b border-brand-border p-2 flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="flex-1 px-2 py-1 text-xs bg-brand-primary text-white rounded hover:bg-brand-primary/90"
            >
              Seleccionar todos
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="flex-1 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
            >
              Limpiar
            </button>
          </div>

          {/* Lista de usuarios */}
          {users.length === 0 ? (
            <div className="p-3 text-sm text-brand-text-disabled text-center">
              No hay usuarios disponibles
            </div>
          ) : (
            <div>
              {users.map((user) => {
                const isSelected = selectedUsers.includes(user.email);
                return (
                  <label
                    key={user.email}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-brand-background cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUser(user.email)}
                      className="sr-only"
                    />
                    <div
                      className={`
                        w-4 h-4 border rounded flex items-center justify-center flex-shrink-0
                        ${isSelected
                          ? 'bg-brand-primary border-brand-primary'
                          : 'border-brand-border bg-white'
                        }
                      `}
                    >
                      {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-brand-text-primary font-medium block truncate">
                        {getDisplayName(user)}
                      </span>
                      {user.name && (
                        <span className="text-xs text-brand-text-disabled block truncate">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
