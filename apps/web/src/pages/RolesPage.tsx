import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../lib/api";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Table, Th, Td } from "../components/ui/Table";
import { Shield, Edit, Trash2, Users, Plus, X, Check, ChevronDown, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

type Permission = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  module?: string | null;
  parentKey?: string | null;
  sortOrder?: number;
};

type PermissionNode = Permission & {
  children: PermissionNode[];
};

type Role = {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  userCount: number;
};

type User = {
  id: number;
  email: string;
  name: string | null;
  active: boolean;
  roles: { id: number; name: string }[];
};

export default function RolesPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  // Verificar permiso
  if (!hasPermission("manage_roles")) {
    return <Navigate to="/" replace />;
  }

  const [selectedTab, setSelectedTab] = useState<"roles" | "users">("roles");
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: "", description: "", permissionIds: [] as number[] });

  // Queries
  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get("/roles")).data as Role[]
  });

  const permissionsQuery = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => (await api.get("/permissions")).data as Permission[]
  });

  // Query para permisos en estructura jerárquica (para UI de edición)
  const permissionsTreeQuery = useQuery({
    queryKey: ["permissions-tree"],
    queryFn: async () => (await api.get("/permissions/tree")).data as PermissionNode[]
  });

  // Estado para controlar qué módulos están expandidos en el formulario
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Toggle para expandir/colapsar módulos
  const toggleModuleExpand = (key: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Función para verificar si un permiso padre está seleccionado (acceso global)
  const isParentSelected = (parentKey: string | null): boolean => {
    if (!parentKey || !permissionsQuery.data) return false;
    const parent = permissionsQuery.data.find(p => p.key === parentKey);
    return parent ? roleForm.permissionIds.includes(parent.id) : false;
  };

  // Función para seleccionar/deseleccionar un permiso padre y sus hijos
  const toggleParentPermission = (node: PermissionNode) => {
    const isSelected = roleForm.permissionIds.includes(node.id);
    const childIds = node.children.map(c => c.id);
    
    if (isSelected) {
      // Deseleccionar padre y todos los hijos
      setRoleForm(prev => ({
        ...prev,
        permissionIds: prev.permissionIds.filter(id => id !== node.id && !childIds.includes(id))
      }));
    } else {
      // Seleccionar padre y todos los hijos
      const newIds = [node.id, ...childIds];
      setRoleForm(prev => ({
        ...prev,
        permissionIds: [...new Set([...prev.permissionIds, ...newIds])]
      }));
      // Expandir el módulo para mostrar los hijos
      setExpandedModules(prev => new Set([...prev, node.key]));
    }
  };

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data as User[]
  });

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; permissionIds: number[] }) => {
      return (await api.post("/roles", data)).data;
    },
    onSuccess: () => {
      toast.success("Rol creado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al crear el rol");
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return (await api.put(`/roles/${id}`, data)).data;
    },
    onSuccess: () => {
      toast.success("Rol actualizado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al actualizar el rol");
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      return (await api.delete(`/roles/${id}`)).data;
    },
    onSuccess: () => {
      toast.success("Rol eliminado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al eliminar el rol");
    }
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      return (await api.post(`/users/${userId}/roles`, { roleId })).data;
    },
    onSuccess: () => {
      toast.success("Rol asignado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al asignar el rol");
    }
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      return (await api.delete(`/users/${userId}/roles/${roleId}`)).data;
    },
    onSuccess: () => {
      toast.success("Rol removido exitosamente");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Error al remover el rol");
    }
  });

  function resetForm() {
    setRoleForm({ name: "", description: "", permissionIds: [] });
    setEditingRole(null);
    setShowRoleForm(false);
  }

  function handleEditRole(role: Role) {
    setEditingRole(role);
    setRoleForm({
      name: role.name,
      description: role.description || "",
      permissionIds: role.permissions.map(p => p.id)
    });
    setShowRoleForm(true);
  }

  function handleSaveRole() {
    if (!roleForm.name.trim()) {
      toast.error("El nombre del rol es obligatorio");
      return;
    }

    if (editingRole) {
      updateRoleMutation.mutate({
        id: editingRole.id,
        data: {
          name: roleForm.name,
          description: roleForm.description || undefined,
          permissionIds: roleForm.permissionIds
        }
      });
    } else {
      createRoleMutation.mutate({
        name: roleForm.name,
        description: roleForm.description || undefined,
        permissionIds: roleForm.permissionIds
      });
    }
  }

  function togglePermission(permissionId: number) {
    setRoleForm(prev => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter(id => id !== permissionId)
        : [...prev.permissionIds, permissionId]
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Shield className="text-brand-600" />
            Gestión de Roles y Permisos
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Administra roles y asigna permisos a los usuarios del sistema
          </p>
        </div>
        {selectedTab === "roles" && !showRoleForm && (
          <Button onClick={() => setShowRoleForm(true)}>
            <Plus size={18} className="mr-2" />
            Nuevo Rol
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setSelectedTab("roles")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === "roles"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Roles ({rolesQuery.data?.length || 0})
        </button>
        <button
          onClick={() => setSelectedTab("users")}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === "users"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Usuarios ({usersQuery.data?.length || 0})
        </button>
      </div>

      {/* Formulario de Rol */}
      {showRoleForm && selectedTab === "roles" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingRole ? "Editar Rol" : "Nuevo Rol"}
              </h2>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X size={18} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del rol *
                  </label>
                  <Input
                    value={roleForm.name}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ej: Analista, Contador, etc."
                    disabled={editingRole?.isSystem}
                  />
                  {editingRole?.isSystem && (
                    <p className="text-xs text-amber-600 mt-1">
                      No se puede cambiar el nombre de un rol del sistema
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <Input
                    value={roleForm.description}
                    onChange={(e) => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del rol"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permisos ({roleForm.permissionIds.length} seleccionados)
                </label>
                <div className="space-y-2">
                  {permissionsTreeQuery.data?.map(node => {
                    const hasChildren = node.children && node.children.length > 0;
                    const isExpanded = expandedModules.has(node.key);
                    const isSelected = roleForm.permissionIds.includes(node.id);
                    
                    return (
                      <div key={node.id} className="border rounded-lg overflow-hidden">
                        {/* Permiso principal / Módulo padre */}
                        <div 
                          className={`flex items-center gap-2 p-3 cursor-pointer transition-colors ${
                            isSelected ? 'bg-brand-50 border-brand-200' : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Checkbox del permiso padre */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => hasChildren ? toggleParentPermission(node) : togglePermission(node.id)}
                            className="flex-shrink-0"
                          />
                          
                          {/* Botón expandir/colapsar (solo si tiene hijos) */}
                          {hasChildren && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleModuleExpand(node.key);
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition-colors"
                            >
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                          
                          {/* Información del permiso */}
                          <div className="flex-1" onClick={() => hasChildren && toggleModuleExpand(node.key)}>
                            <div className="font-medium text-sm flex items-center gap-2">
                              {node.name}
                              {hasChildren && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                  {node.children.length} submódulos
                                </span>
                              )}
                              {isSelected && hasChildren && (
                                <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded">
                                  Acceso completo
                                </span>
                              )}
                            </div>
                            {node.description && (
                              <div className="text-xs text-gray-500">{node.description}</div>
                            )}
                          </div>
                        </div>
                        
                        {/* Submódulos (si tiene hijos y está expandido) */}
                        {hasChildren && isExpanded && (
                          <div className="border-t bg-gray-50 pl-8 py-2 space-y-1">
                            {node.children.map(child => {
                              const childSelected = roleForm.permissionIds.includes(child.id);
                              const parentSelected = isSelected;
                              
                              return (
                                <label
                                  key={child.id}
                                  className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                                    childSelected ? 'bg-brand-50' : 'hover:bg-gray-100'
                                  } ${parentSelected ? 'opacity-75' : ''}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={childSelected}
                                    onChange={() => togglePermission(child.id)}
                                    disabled={parentSelected}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{child.name}</div>
                                    {child.description && (
                                      <div className="text-xs text-gray-500">{child.description}</div>
                                    )}
                                    {parentSelected && (
                                      <div className="text-xs text-brand-600 italic">
                                        Incluido por acceso global
                                      </div>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveRole} disabled={createRoleMutation.isPending || updateRoleMutation.isPending}>
                  <Check size={18} className="mr-2" />
                  {editingRole ? "Actualizar Rol" : "Crear Rol"}
                </Button>
                <Button variant="secondary" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Roles */}
      {selectedTab === "roles" && !showRoleForm && (
        <Card>
          <CardContent>
            {rolesQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">Cargando roles...</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Rol</Th>
                    <Th>Descripción</Th>
                    <Th>Permisos</Th>
                    <Th>Usuarios</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {rolesQuery.data?.map(role => (
                    <tr key={role.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.name}</span>
                          {role.isSystem && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                              Sistema
                            </span>
                          )}
                        </div>
                      </Td>
                      <Td className="text-sm text-gray-600">{role.description || "—"}</Td>
                      <Td>
                        <span className="text-sm text-gray-600">
                          {role.permissions.length} permisos
                        </span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Users size={14} />
                          {role.userCount}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                          >
                            <Edit size={16} />
                          </Button>
                          {!role.isSystem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`¿Eliminar el rol "${role.name}"?`)) {
                                  deleteRoleMutation.mutate(role.id);
                                }
                              }}
                              disabled={deleteRoleMutation.isPending}
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabla de Usuarios */}
      {selectedTab === "users" && (
        <Card>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">Cargando usuarios...</div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Usuario</Th>
                    <Th>Correo</Th>
                    <Th>Estado</Th>
                    <Th>Roles Asignados</Th>
                    <Th>Acciones</Th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data?.map(user => (
                    <tr key={user.id}>
                      <Td className="font-medium">{user.name || "—"}</Td>
                      <Td className="text-sm text-gray-600">{user.email}</Td>
                      <Td>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          user.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}>
                          {user.active ? "Activo" : "Inactivo"}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map(role => (
                            <span
                              key={role.id}
                              className="text-xs bg-brand-100 text-brand-800 px-2 py-0.5 rounded flex items-center gap-1"
                            >
                              {role.name}
                              <button
                                onClick={() => {
                                  if (confirm(`¿Remover el rol "${role.name}" de ${user.email}?`)) {
                                    removeRoleMutation.mutate({ userId: user.id, roleId: role.id });
                                  }
                                }}
                                className="hover:text-red-600"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                          {user.roles.length === 0 && (
                            <span className="text-xs text-gray-500">Sin roles</span>
                          )}
                        </div>
                      </Td>
                      <Td>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              assignRoleMutation.mutate({ 
                                userId: user.id, 
                                roleId: Number(e.target.value) 
                              });
                              e.target.value = "";
                            }
                          }}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="">Asignar rol...</option>
                          {rolesQuery.data
                            ?.filter(role => !user.roles.some(ur => ur.id === role.id))
                            .map(role => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                        </select>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
