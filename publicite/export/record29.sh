#!/bin/bash
cd "$(dirname "$0")/.."
BRAVE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
rm -rf video/frames29 && mkdir -p video/frames29
"$BRAVE" --headless=new --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check --allow-file-access-from-files --autoplay-policy=no-user-gesture-required --force-device-scale-factor=1 --window-size=1080,1920 file://$(pwd)/export/video-29s.html >/dev/null 2>&1 &
PID=$!
sleep 6
for i in {0..869}; do
  t=$(echo "scale=3; $i/30" | bc)
  screencapture -x -t png -R0,0,1080,1920 "/tmp/wsf$i.png" 2>/dev/null || true
  sleep 0.033
done
kill $PID 2>/dev/null
killall "Brave Browser" 2>/dev/null
