@echo off
title Sellobay Dev Launcher
chcp 65001 >nul
echo ============================================
echo    SELLOBAY - dev serverlarni ishga tushirish
echo ============================================
echo.
echo Joriy LAN IP (telefon SHU WiFi'da bo'lsin):
powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -eq 'Dhcp' -and $_.IPAddress -notlike '169.*' } | Select-Object -First 1 -ExpandProperty IPAddress"
echo.
echo Web API (:3000) va Metro (:8081) alohida oynalarda ochilmoqda...
start "Sellobay WEB :3000" cmd /k "cd /d %~dp0apps\web && npm run dev"
start "Sellobay METRO :8081" cmd /k "cd /d %~dp0apps\mobile && npm run dev"
echo.
echo TAYYOR - ikki oyna ochildi:
echo   [WEB]   backend API (login, katalog, buyurtma)
echo   [METRO] mobil ilova (telefonda dev build bilan ulaning)
echo.
echo Telefonda: Sellobay dev build -^> Metro oynasidagi QR'ni skanerlang.
echo IP avtomatik aniqlanadi - WiFi o'zgarsa shunchaki bu skriptni qayta ishga tushiring.
echo.
pause
