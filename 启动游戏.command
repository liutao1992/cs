#!/bin/zsh
cd "${0:A:h}" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo '未找到 Node.js。请先安装 Node.js 22 或更新版本，再双击启动。'
  read -r '?按回车关闭…'
  exit 1
fi
if [[ ! -d node_modules/three ]]; then
  npm install --no-audit --no-fund || exit 1
fi
if [[ "$(curl --noproxy '*' -fsS http://127.0.0.1:3000/health 2>/dev/null)" == 'DUST_SECTOR_OK' ]]; then
  open http://localhost:3000
  exit 0
fi
node server.mjs &
game_pid=$!
trap 'kill "$game_pid" 2>/dev/null' EXIT INT TERM
for attempt in {1..40}; do
  if ! kill -0 "$game_pid" 2>/dev/null; then
    echo '启动失败，请检查 3000 端口是否被其他程序占用。'
    read -r '?按回车关闭…'
    exit 1
  fi
  if [[ "$(curl --noproxy '*' -fsS http://127.0.0.1:3000/health 2>/dev/null)" == 'DUST_SECTOR_OK' ]]; then
    open http://localhost:3000
    break
  fi
  sleep 0.25
done
wait "$game_pid"
