@echo off
title Sellobay - App Update (OTA)
chcp 65001 >nul
cd /d %~dp0apps\mobile
echo ============================================
echo    SELLOBAY - ilovani yangilash (OTA update)
echo ============================================
echo.
echo Bu JS/dizayn o'zgarishlarni o'rnatilgan APK'ga HAVODAN yuboradi
echo (APK'ni qayta qurish SHART EMAS - native o'zgarmagan bo'lsa).
echo.
set /p BR=Branch (preview / development) [preview]:
if "%BR%"=="" set BR=preview
set /p MSG=Izoh (Enter = standart):
if "%MSG%"=="" set MSG=Manual update
echo.
echo eas update ishga tushmoqda... (branch: %BR%)
call eas update --branch %BR% --message "%MSG%"
echo.
echo Tugadi. Foydalanuvchi ilovani qayta ochsa - yangilanadi.
echo (eas topilmasa: npm i -g eas-cli, keyin eas login)
pause
