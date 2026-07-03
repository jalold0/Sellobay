@echo off
title Sellobay - Firewall setup (bir martalik)
chcp 65001 >nul
net session >nul 2>&1
if %errorlevel% NEQ 0 (
  echo Admin huquqi kerak - elevated oynada qayta ochilmoqda...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
echo Sellobay dev firewall qoidalari sozlanmoqda (:3000 web, :8081 Metro)...
netsh advfirewall firewall delete rule name="Sellobay Dev 3000" >nul 2>&1
netsh advfirewall firewall delete rule name="Sellobay Dev 8081" >nul 2>&1
netsh advfirewall firewall add rule name="Sellobay Dev 3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Sellobay Dev 8081" dir=in action=allow protocol=TCP localport=8081
echo.
echo TAYYOR. Telefon endi kompyuterga :3000 va :8081 orqali ulana oladi.
echo Buni FAQAT BIR MARTA qilish kifoya - WiFi o'zgarsa ham qayta shart emas
echo (qoida portga bog'liq, IP'ga emas).
echo.
pause
