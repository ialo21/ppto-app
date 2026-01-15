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
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer clic fuera
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

  const filteredUsers = users.filter((user) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      user.email.toLowerCase().includes(term) ||
      (user.name?.toLowerCase().includes(term) ?? false)
    );
  });

  // Helper para obtener el nombre a mostrar
  const getDisplayName = (user: UserOption) => {
    if (user.name) {
      return user.name;
    }
    return user.email;
  };

  const getSelectedLabel = () => {
    if (selectedUsers.length === 0) return placeholder;
    if (selectedUsers.length === 1) {
      const user = users.find(u => u.email === selectedUsers[0]);
      return user ? getDisplayName(user) : selectedUsers[0];
    }

    const firstUser = users.find(u => u.email === selectedUsers[0]);
    const firstName = firstUser ? getDisplayName(firstUser) : selectedUsers[0];
    
    return `${firstName} +${selectedUsers.length - 1}`;
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
        <span className={selectedUsers.length === 0 ? "text-brand-text-disabled" : "text-brand-text-primary"}>
          {getSelectedLabel()}
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-brand-border rounded-xl shadow-lg max-h-72 overflow-hidden">
          {/* Acciones rápidas */}
          <div className="sticky top-0 bg-white border-b border-brand-border p-2 flex flex-col gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo"
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

          {/* Lista de usuarios */}
          {filteredUsers.length === 0 ? (
            <div className="p-3 text-sm text-brand-text-disabled text-center">
              No hay usuarios disponibles
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto">
              {filteredUsers.map((user) => {
                const isSelected = selectedUsers.includes(user.email);
                return (
                  <button
                    key={user.email}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => toggleUser(user.email)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-brand-background cursor-pointer"
                  >
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
                      <span className="text-sm text-brand-text-primary font-medium block break-words" title={getDisplayName(user)}>
                        {getDisplayName(user)}
                      </span>
                      {user.name && (
                        <span className="text-xs text-brand-text-disabled block break-words" title={user.email}>
                          {user.email}
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
