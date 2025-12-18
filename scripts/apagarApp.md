# Apagar / Detener App (systemd)

## Detener API

```bash
sudo systemctl stop ppto-api-dev
sudo systemctl status ppto-api-dev


Detener Web

sudo systemctl stop ppto-web-dev
sudo systemctl status ppto-web-dev


Opcional: evitar que arranque al reiniciar el servidor

sudo systemctl disable ppto-api-dev
sudo systemctl disable ppto-web-dev


Opcional: volver a habilitar el arranque automático

sudo systemctl enable ppto-api-dev
sudo systemctl enable ppto-web-dev