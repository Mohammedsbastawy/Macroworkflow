#!/usr/bin/env bash
# ============================================================
# Deploy — Macro Workflow System (MySQL schema v2 / PascalCase)
# شغّل السكربت ده على السيرفر بعد رفع ملفات الكود المحدّثة
# Usage: sudo bash deploy.sh
# ============================================================
set -euo pipefail

echo "==> [1/4] Deleting old DB volume (محذوف أي بيانات قديمة بأسماء قديمة)"
sudo docker-compose down -v || true

echo "==> [2/4] Rebuilding containers (Dockerfile -> Node 22)"
sudo docker-compose up --build -d db

echo "==> [3/4] Waiting for MySQL to become healthy"
for i in $(seq 1 60); do
  if sudo docker exec workflow-mysql sh -c "mysqladmin ping -h localhost -u root -proot123password --silent" 2>/dev/null; then
    echo "    MySQL is ready"
    break
  fi
  sleep 2
done

echo "==> [4/4] Building the app container (schema init + seed راح يتشغّلوا تلقائيًا)"
sudo docker-compose up --build -d app

echo "==> Done! App على المنفذ 80 -> http://<SERVER_IP>/"
echo "    اعرض اللوجز: sudo docker logs workflow-app"
