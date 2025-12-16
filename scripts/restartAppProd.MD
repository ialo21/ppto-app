# Mini guía: reiniciar PPTO App (Prod VM)

La app corre como servicios `systemd` (API/Web) y la DB corre con `docker compose`.

## Reiniciar API

```bash
sudo systemctl restart ppto-api-dev
sudo systemctl status ppto-api-dev
```

## Reiniciar Web

```bash
sudo systemctl restart ppto-web-dev
sudo systemctl status ppto-web-dev
```

## Ver logs en vivo

```bash
journalctl -u ppto-api-dev -f
journalctl -u ppto-web-dev -f
```

## Si cambiaste un `.service` (ExecStart, WorkingDirectory, etc.)

Después de editar el archivo en `/etc/systemd/system/*.service`:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ppto-api-dev
sudo systemctl restart ppto-web-dev
```

## DB (Postgres) / Docker Compose

### Aplicar cambios del `docker-compose.yml`

```bash
docker compose up -d db
```

### Reiniciar solo Postgres

```bash
docker compose restart db
```

## Nota rápida

- **Código**: en `dev`, normalmente `tsx watch` (API) y `vite` (Web) recargan solos.
- **Config / env vars**: si cambiaste variables de entorno o algo que el watcher no toma, usa `systemctl restart ...`.