@echo off
title SidakStruk - Mobile Web Server
echo Menjalankan SidakStruk di http://localhost:8080 ...
echo Untuk membuka di HP, pastikan HP dan laptop di Wi-Fi yang sama lalu buka IP komputer Anda pada port 8080.
start http://localhost:8080
python -m http.server 8080 --bind 0.0.0.0
