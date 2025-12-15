# Script de backup de base de datos PostgreSQL con encoding UTF-8 correcto
# 
# Problema identificado: PowerShell 'type' no maneja UTF-8 correctamente por defecto,
# causando que caracteres con tilde (á, é, í, ó, ú, ñ) se corrompan como ??
#
# Solución: Este script usa docker exec con configuración UTF-8 explícita
#
# Uso: .\scripts\backup-database.ps1 [nombre-archivo]

param(
    [string]$OutputFile = "backup-ppto-$(Get-Date -Format 'yyyy-MM-dd').sql"
)

$ErrorActionPreference = "Stop"

$OutputPath = [System.IO.Path]::GetFullPath($OutputFile)

Write-Host "🗄️  Generando backup de base de datos..." -ForegroundColor Cyan
Write-Host "   Archivo de salida: $OutputPath" -ForegroundColor Gray

# Verificar que el contenedor Docker está corriendo
$containerRunning = docker ps --filter "name=ppto-app-db-1" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Host "❌ Error: El contenedor ppto-app-db-1 no está corriendo" -ForegroundColor Red
    Write-Host "   Ejecuta: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

# Generar backup con encoding UTF-8 explícito
try {
    # Usar docker exec con configuración de encoding correcta
    $env:PGCLIENTENCODING = "UTF8"
    
    docker exec ppto-app-db-1 pg_dump `
        -U ppto `
        -d ppto `
        --encoding=UTF8 `
        --no-owner `
        --no-acl `
        --clean `
        --if-exists `
        -f "/tmp/backup-temp.sql"

    Write-Host "   pg_dump exit code: $LASTEXITCODE" -ForegroundColor DarkGray
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al generar el backup" -ForegroundColor Red
        exit 1
    }

    docker exec ppto-app-db-1 ls -l /tmp/backup-temp.sql
    Write-Host "   ls temp file exit code: $LASTEXITCODE" -ForegroundColor DarkGray
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error: no se encontró /tmp/backup-temp.sql dentro del contenedor" -ForegroundColor Red
        exit 1
    }

    # Copiar el archivo desde el contenedor con encoding UTF-8
    docker cp "ppto-app-db-1:/tmp/backup-temp.sql" $OutputPath

    Write-Host "   docker cp exit code: $LASTEXITCODE" -ForegroundColor DarkGray

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al copiar el backup desde el contenedor" -ForegroundColor Red
        exit 1
    }

    # Limpiar archivo temporal en el contenedor
    docker exec ppto-app-db-1 rm /tmp/backup-temp.sql

    # Verificar que el archivo se creó correctamente
    if (Test-Path $OutputPath) {
        $item = Get-Item $OutputPath
        $fileSize = $item.Length / 1MB
        Write-Host "✅ Backup generado exitosamente" -ForegroundColor Green
        Write-Host "   Tamaño: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
        Write-Host "   Ubicación: $OutputPath" -ForegroundColor Gray
        Write-Host "   Archivo: $($item.Name)" -ForegroundColor DarkGray
    } else {
        Write-Host "❌ Error: El archivo de backup no se creó" -ForegroundColor Red
        exit 1
    }

} catch {
    Write-Host "❌ Error durante el backup: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n📋 IMPORTANTE: Cómo restaurar este backup correctamente:" -ForegroundColor Yellow
Write-Host "   1. Detener el servidor API si está corriendo" -ForegroundColor Gray
Write-Host "   2. Ejecutar: .\scripts\restore-database.ps1 $OutputPath" -ForegroundColor Gray
Write-Host "`n⚠️  NO usar 'type | docker exec' ya que corrompe caracteres UTF-8" -ForegroundColor Yellow
