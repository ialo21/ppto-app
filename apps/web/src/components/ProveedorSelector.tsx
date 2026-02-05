import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ChevronDown, Search, X, Plus, Building2 } from "lucide-react";
import { cn } from "../lib/ui";
import { toast } from "sonner";

type Proveedor = {
  id: number;
  razonSocial: string;
  ruc: string;
  active: boolean;
};

interface ProveedorSelectorProps {
  label?: string;
  placeholder?: string;
  value: number | null; // proveedorId
  onChange: (proveedorId: number | null, proveedor: Proveedor | null) => void;
  disabled?: boolean;
  className?: string;
  error?: string;
  allowCreate?: boolean; // Permitir crear nuevo proveedor inline
}

/**
 * ProveedorSelector - Componente reutilizable para selección de proveedores
 * 
 * Características:
 * - Búsqueda por razón social o RUC
 * - Autocompletado con dropdown
 * - Opción de crear nuevo proveedor inline
 * - Muestra RUC al seleccionar
 * - Diseño consistente con FilterSelect
 */
export default function ProveedorSelector({
  label,
  placeholder = "Buscar proveedor...",
  value,
  onChange,
  disabled = false,
  className,
  error,
  allowCreate = true
}: ProveedorSelectorProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProveedor, setNewProveedor] = useState({ razonSocial: "", ruc: "" });
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Query para obtener proveedores
  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ["proveedores"],
    queryFn: async () => (await api.get("/proveedores")).data as Proveedor[]
  });

  // Proveedor seleccionado actualmente
  const selectedProveedor = useMemo(() => {
    if (!value) return null;
    return proveedores.find(p => p.id === value) || null;
  }, [value, proveedores]);

  // Filtrar proveedores por búsqueda
  const filteredProveedores = useMemo(() => {
    if (!searchTerm.trim()) return proveedores;
    const search = searchTerm.toLowerCase();
    return proveedores.filter(p =>
      p.razonSocial.toLowerCase().includes(search) ||
      p.ruc.includes(search)
    );
  }, [proveedores, searchTerm]);

  // Mutation para crear proveedor
  const createProveedor = useMutation({
    mutationFn: async (data: { razonSocial: string; ruc: string }) => {
      const response = await api.post("/proveedores/find-or-create", data);
      return response.data;
    },
    onSuccess: (data) => {
      const { proveedor, created } = data;
      toast.success(created ? "Proveedor creado" : "Proveedor encontrado");
      queryClient.invalidateQueries({ queryKey: ["proveedores"] });
      onChange(proveedor.id, proveedor);
      setShowCreateForm(false);
      setNewProveedor({ razonSocial: "", ruc: "" });
      setIsOpen(false);
      setSearchTerm("");
    },
    onError: (error: any) => {
      const msg = error.response?.data?.issues?.[0]?.message || 
                  error.response?.data?.error || 
                  "Error al crear proveedor";
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

  const handleSelect = (proveedor: Proveedor) => {
    onChange(proveedor.id, proveedor);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  const handleCreateSubmit = () => {
    const razonSocial = newProveedor.razonSocial.trim();
    const ruc = newProveedor.ruc.trim();
    
    if (!razonSocial) {
      toast.error("Razón social es requerida");
      return;
    }
    if (!/^\d{11}$/.test(ruc)) {
      toast.error("RUC debe tener 11 dígitos");
      return;
    }
    
    createProveedor.mutate({ razonSocial, ruc });
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
          <Building2 size={16} className="text-brand-text-disabled flex-shrink-0" />
          {selectedProveedor ? (
            <div className="flex-1 min-w-0">
              <span className="block truncate font-medium">
                {selectedProveedor.razonSocial}
              </span>
              <span className="block text-xs text-brand-text-secondary font-mono">
                RUC: {selectedProveedor.ruc}
              </span>
            </div>
          ) : (
            <span className="text-brand-text-disabled">{placeholder}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedProveedor && !disabled && (
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
                placeholder="Buscar nombre o RUC..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
            </div>
          </div>

          {/* Lista de proveedores */}
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 text-sm text-brand-text-disabled text-center">
                Cargando...
              </div>
            ) : filteredProveedores.length === 0 ? (
              <div className="p-3 text-sm text-brand-text-disabled text-center">
                {searchTerm ? "No se encontraron proveedores" : "Sin proveedores"}
              </div>
            ) : (
              filteredProveedores.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-surface-hover transition-colors",
                    "flex flex-col",
                    value === p.id && "bg-brand-primary/10"
                  )}
                >
                  <span className="text-sm font-medium truncate">{p.razonSocial}</span>
                  <span className="text-xs text-brand-text-secondary font-mono">
                    RUC: {p.ruc}
                  </span>
                </button>
              ))
            )}
          </div>

          {/* Crear nuevo proveedor */}
          {allowCreate && (
            <div className="border-t border-border-default">
              {showCreateForm ? (
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Razón social *"
                    value={newProveedor.razonSocial}
                    onChange={e => setNewProveedor(p => ({ ...p, razonSocial: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                  />
                  <input
                    type="text"
                    placeholder="RUC (11 dígitos) *"
                    maxLength={11}
                    value={newProveedor.ruc}
                    onChange={e => setNewProveedor(p => ({ ...p, ruc: e.target.value.replace(/\D/g, '') }))}
                    className="w-full px-3 py-2 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/20 font-mono"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateSubmit}
                      disabled={createProveedor.isPending}
                      className="flex-1 px-3 py-2 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-hover disabled:opacity-50"
                    >
                      {createProveedor.isPending ? "Creando..." : "Crear proveedor"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewProveedor({ razonSocial: "", ruc: "" });
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
                    if (searchTerm && !/^\d+$/.test(searchTerm)) {
                      setNewProveedor(p => ({ ...p, razonSocial: searchTerm }));
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-brand-primary hover:bg-surface-hover flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span>Crear nuevo proveedor</span>
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
