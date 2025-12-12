# Script de restauración de base de datos PostgreSQL con encoding UTF-8 correcto
#
# Problema identificado: PowerShell 'type' no maneja UTF-8 correctamente,
# causando que los caracteres con tilde se corrompan durante la restauración
#
# Solución: Este script usa Get-Content con encoding UTF-8 explícito
#
# Uso: .\scripts\restore-database.ps1 <archivo-backup.sql>

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

# Verificar que el archivo existe
if (-not (Test-Path $BackupFile)) {
    Write-Host "[X] Error: El archivo $BackupFile no existe" -ForegroundColor Red
    exit 1
}

# Verificar que el contenedor esta corriendo
$containerRunning = docker ps --filter "name=ppto-app-db-1" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Host "[X] Error: El contenedor ppto-app-db-1 no esta corriendo" -ForegroundColor Red
    Write-Host "   Ejecuta: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "[!] ADVERTENCIA: Esta operacion eliminara todos los datos actuales" -ForegroundColor Yellow
Write-Host "   Archivo a restaurar: $BackupFile" -ForegroundColor Gray
$confirmation = Read-Host "Desea continuar? (S/N)"

if ($confirmation -ne "S" -and $confirmation -ne "s") {
    Write-Host "[X] Operacion cancelada" -ForegroundColor Red
    exit 0
}

Write-Host "`n[DB] Iniciando restauracion de base de datos..." -ForegroundColor Cyan

try {
    # Paso 1: Limpiar el esquema actual
    Write-Host "   [1/4] Limpiando esquema actual..." -ForegroundColor Gray
    docker exec ppto-app-db-1 psql -U ppto -d ppto -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Error al limpiar el esquema" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "   [OK] Esquema limpio" -ForegroundColor Green

    # Paso 2: Restaurar desde backup con encoding UTF-8 correcto
    Write-Host "   [2/4] Restaurando datos desde backup..." -ForegroundColor Gray
    
    # IMPORTANTE: Usar Get-Content con -Encoding UTF8 para leer el archivo correctamente
    # Luego enviarlo al contenedor Docker que esta configurado para UTF-8
    Get-Content $BackupFile -Encoding UTF8 | docker exec -i ppto-app-db-1 psql -U ppto -d ppto
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Error durante la restauracion" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "   [OK] Datos restaurados" -ForegroundColor Green

    # Paso 3: Aplicar migraciones de Prisma
    Write-Host "   [3/4] Aplicando migraciones de Prisma..." -ForegroundColor Gray
    Push-Location packages\db
    npx prisma migrate deploy
    Pop-Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[X] Error al aplicar migraciones" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "   [OK] Migraciones aplicadas" -ForegroundColor Green

    # Paso 4: Ejecutar seed para actualizar permisos
    Write-Host "   [4/4] Ejecutando seed..." -ForegroundColor Gray
    Push-Location packages\db
    npx tsx seed.ts
    Pop-Location
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[!] Warning: El seed fallo, pero la restauracion continuo" -ForegroundColor Yellow
    } else {
        Write-Host "   [OK] Seed ejecutado" -ForegroundColor Green
    }

    Write-Host "`n[OK] Restauracion completada exitosamente" -ForegroundColor Green
    Write-Host "`nProximos pasos:" -ForegroundColor Cyan
    Write-Host "   1. Reinicia el servidor API si estaba corriendo: pnpm run dev" -ForegroundColor Gray
    Write-Host "   2. Verifica que los textos con tildes se vean correctamente" -ForegroundColor Gray

} catch {
    Write-Host "`n[X] Error durante la restauracion: $_" -ForegroundColor Red
    Write-Host "   La base de datos puede estar en un estado inconsistente" -ForegroundColor Yellow
    exit 1
}
