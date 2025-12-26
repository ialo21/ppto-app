-- Limpiar labels legacy de períodos para forzar formato YYYY-MM en frontend
-- Todos los labels se establecen a NULL para que el sistema use year/month

UPDATE "Period" SET label = NULL WHERE label IS NOT NULL;

-- Verificar cambios
SELECT id, year, month, label FROM "Period" ORDER BY year, month;
