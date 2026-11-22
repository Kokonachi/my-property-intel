#!/bin/bash
set -u
ROOT=/workspace/my-property-intel/scraper
LOG=$ROOT/photo_upgrade/logs/watch_crawl.log
PIDF=$ROOT/photo_upgrade/logs/crawl_brickz.pid
CLOG=$ROOT/photo_upgrade/logs/crawl_brickz.log
CSV=/workspace/my-property-intel/data/kl_selangor_candidates.csv
log() { echo "$(date '+%H:%M:%S') $*" | tee -a "$LOG"; }
alive() { [ -f "$PIDF" ] && ps -p "$(cat "$PIDF")" >/dev/null 2>&1; }
done_logged() { tail -20 "$CLOG" 2>/dev/null | grep -q 'DONE'; }
start_crawl() {
  cd "$ROOT"
  nohup ./.venv/bin/python -u photo_upgrade/crawl_brickz_list.py >> photo_upgrade/logs/crawl_brickz_stdout.log 2>&1 &
  echo $! > "$PIDF"
  log "started crawl pid=$(cat "$PIDF")"
}
for i in $(seq 1 80); do
  if done_logged; then
    log "crawl DONE"
    break
  fi
  if ! alive; then
    log "crawl dead; restarting"
    start_crawl
  fi
  if [ $((i % 6)) -eq 0 ]; then
    log "still going: $(tail -1 "$CLOG")"
  fi
  sleep 20
done
if ! done_logged; then
  log "gave up waiting; last=$(tail -1 "$CLOG")"
  exit 1
fi
"$ROOT/.venv/bin/python" "$ROOT/photo_upgrade/build_candidates_csv.py" >> "$LOG" 2>&1
log "csv built: $(ls -la $CSV 2>&1)"
