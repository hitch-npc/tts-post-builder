#!/bin/sh
# Обновить стили постов из дизайн-системы: SMM-слой собирается в tts-design-system из smm.tokens.json.
# Запуск из корня конструктора: sh ds/sync.sh
set -e
curl -fsSL https://raw.githubusercontent.com/hitch-npc/tts-design-system/main/ds-smm.css -o ds/ds-smm.css
echo "ds/ds-smm.css обновлён"
