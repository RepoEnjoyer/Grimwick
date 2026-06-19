#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/next/dist/bin/next dev -p 3000 >> /tmp/nextdev-persistent.log 2>&1
  echo "Next crashed, restarting in 2s..." >> /tmp/nextdev-persistent.log
  sleep 2
done
