import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ChevronDown, Search, X, Plus, User } from "lucide-react";
import { cn } from "../lib/ui";
import { toast } from "sonner";

type Usuario = {
  id: number;
  name: string;
  email: string;
  active: boolean;
};

interface ResponsableSelectorProps {
  label?: string;
  placeholder?: string;
  value: number | null; // userId
  onChange: (userId: number | null) => void;
  disabled?: boolean;
  className?: string;
  error?: string;
  allowCreate?: boolean; // Permitir crear nuevo usuario inline
}

/**
 * ResponsableSelector - Componente reutilizable para selección de responsables
 * 
 * Características:
 * - Búsqueda por nombre o email
 * - Autocompletado con dropdown
 * - Opción de crear nuevo usuario inline
 * - Muestra email al seleccionar
 * - Diseño consistente con ProveedorSelector
 */
export default function ResponsableSelector({
  label,
  placeholder = "Buscar responsable...",
  value,
  onChange,
  disabled = false,
  className,
  error,
  allowCreate = true
}: ResponsableSelectorProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "" });
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Query para obtener usuarios
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data as Usuario[]
  });

  // Usuario seleccionado actualmente
  const selectedUser = useMemo(() => {
    if (!value) return null;
    return users.find(u => u.id === value) || null;
  }, [value, users]);

  // Filtrar usuarios por búsqueda
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users.filter(u => u.active);
    const search = searchTerm.toLowerCase();
    return users.filter(u =>
      u.active && (
        u.name?.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      )
    );
  }, [users, searchTerm]);

  // Mutation para crear usuario
  const createUser = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const response = await api.post("/users", {
        ...data,
        active: true
      });
      return response.data;
    },
    onSuccess: (user) => {
      toast.success("Usuario creado correctamente");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onChange(user.id);
      setShowCreateForm(false);
      setNewUser({ name: "", email: "" });
      setIsOpen(false);
      setSearchTerm("");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.issues?.[0]?.message || 
                  error.response?.data?.error || 
                  "Error al crear usuario";
      toast.error(msg);
    }
  });

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
        setShowCreateForm(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) updateDropdownPosition();
    };

    const handleResize = () => {
      if (isOpen) updateDropdownPosition();
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

  const handleSelect = (user: Usuario) => {
    onChange(user.id);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const handleCreateSubmit = () => {
    const name = newUser.name.trim();
    const email = newUser.email.trim().toLowerCase();
    
    if (!name) {
      toast.error("Nombre es requerido");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Email válido es requerido");
      return;
    }
    
    createUser.mutate({ name, email });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setSearchTerm("");
      setShowCreateForm(false);
    }
  };

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      {label && (
        <label className="block text-sm font-medium text-brand-text-primary mb-1">
          {label}
        </label>
      )}
      
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "px-3 py-2 rounded-xl border border-border-default dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-gray-200",
          "text-left text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary",
          disabled && "opacity-50 cursor-not-allowed bg-surface-hover",
          error && "border-red-500",
          className
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <User size={16} className="text-brand-text-disabled flex-shrink-0" />
          {selectedUser ? (
            <div className="flex-1 min-w-0">
              <span className="block truncate font-medium">
                {selectedUser.name || selectedUser.email}
              </span>
              {selectedUser.name && (
                <span className="block text-xs text-brand-text-secondary truncate">
                  {selectedUser.email}
                </span>
              )}
            </div>
          ) : (
            <span className="text-brand-text-disabled">{placeholder}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedUser && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-surface-hover rounded"
            >
              <X size={14} className="text-brand-text-disabled" />
            </button>
          )}
          <ChevronDown
            size={16}
            className={cn(
              "text-brand-text-disabled transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </button>

      {error && (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      )}

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl border border-border-default dark:border-slate-600 shadow-lg overflow-hidden"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: Math.max(dropdownPosition.width, 320)
          }}
        >
          {/* Búsqueda */}
          <div className="p-2 border-b border-border-default">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-disabled" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          {/* Lista de usuarios */}
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 text-sm text-brand-text-disabled text-center">
                Cargando...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-3 text-sm text-brand-text-disabled text-center">
                {searchTerm ? "No se encontraron usuarios" : "Sin usuarios"}
              </div>
            ) : (
              filteredUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelect(u)}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-surface-hover transition-colors",
                    "flex flex-col",
                    value === u.id && "bg-brand-primary/10"
                  )}
                >
                  <span className="text-sm font-medium truncate">{u.name || u.email}</span>
                  {u.name && (
                    <span className="text-xs text-brand-text-secondary truncate">
                      {u.email}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Crear nuevo usuario */}
          {allowCreate && (
            <div className="border-t border-border-default">
              {showCreateForm ? (
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Nombre completo *"
                    value={newUser.name}
                    onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={newUser.email}
                    onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateSubmit}
                      disabled={createUser.isPending}
                      className="flex-1 px-3 py-2 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-hover disabled:opacity-50"
                    >
                      {createUser.isPending ? "Creando..." : "Crear usuario"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewUser({ name: "", email: "" });
                      }}
                      className="px-3 py-2 text-sm border border-border-default rounded-lg hover:bg-surface-hover"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(true);
                    // Pre-llenar con el término de búsqueda si parece un nombre
                    if (searchTerm && !searchTerm.includes("@")) {
                      setNewUser(u => ({ ...u, name: searchTerm }));
                    } else if (searchTerm.includes("@")) {
                      setNewUser(u => ({ ...u, email: searchTerm }));
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-brand-primary hover:bg-surface-hover flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>Crear nuevo responsable</span>
                </button>
              )}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
