@echo off
echo ===================================================
echo Building Gori and Jibo (ጎሪ እና ጅቦ) Android APK
echo ===================================================
cd /d "%~dp0"
gradle assembleDebug
echo.
echo Build finished! The APK file is located in:
echo app\build\outputs\apk\debug\app-debug.apk
pause
