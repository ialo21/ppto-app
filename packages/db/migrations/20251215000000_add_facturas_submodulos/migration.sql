-- Migración: Agregar submódulos para Facturas
-- Fecha: 2025-12-15
-- Propósito: Crear permisos jerárquicos para Facturas (Listado y Gestión)

-- Actualizar el permiso existente de facturas para que sea el módulo padre
UPDATE "Permission" 
SET 
  "module" = 'facturas',
  "sortOrder" = 40
WHERE "key" = 'facturas';

-- Insertar submódulo: Listado de Facturas (viewer)
INSERT INTO "Permission" ("key", "name", "description", "module", "parentKey", "sortOrder")
VALUES (
  'facturas:listado',
  'Facturas - Listado',
  'Acceso de solo lectura al listado de facturas',
  'facturas',
  'facturas',
  1
);

-- Insertar submódulo: Gestión/Registro de Facturas (admin)
INSERT INTO "Permission" ("key", "name", "description", "module", "parentKey", "sortOrder")
VALUES (
  'facturas:gestion',
  'Facturas - Gestión / Registro',
  'Acceso completo para crear, editar y eliminar facturas',
  'facturas',
  'facturas',
  2
);

-- Nota: Los usuarios con permiso 'facturas' (global) tendrán acceso a todos los submódulos
-- Los usuarios con permisos específicos solo accederán a sus submódulos asignados
