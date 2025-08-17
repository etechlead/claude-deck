@echo off
setlocal enabledelayedexpansion

:: Set default port to 17880 if no argument provided
set PORT=%1
if "%PORT%"=="" set PORT=17880

echo Testing multiple slots simultaneously...
echo Port: %PORT%
echo.

:: Check available slots first
echo Checking available slots...
curl -sS localhost:%PORT%/slots
echo.
echo.

:: Start test services simultaneously
echo Starting test services...
start /B curl -sS -X POST localhost:%PORT%/start -H "Content-Type: application/json" -d "{\"id\":\"data-ingest\",\"name\":\"Data Ingest\"}"
start /B curl -sS -X POST localhost:%PORT%/start -H "Content-Type: application/json" -d "{\"id\":\"video-encode\",\"name\":\"Video Encode\"}"
start /B curl -sS -X POST localhost:%PORT%/start -H "Content-Type: application/json" -d "{\"id\":\"backup-sync\",\"name\":\"Backup Sync\"}"
start /B curl -sS -X POST localhost:%PORT%/start -H "Content-Type: application/json" -d "{\"id\":\"ai-training\",\"name\":\"AI Training\"}"

:: Wait for all to start
timeout /t 3 /nobreak >nul

echo All services started! Check your Stream Deck.
echo.

:: Show current status
echo Current slot status:
curl -sS localhost:%PORT%/slots
echo.
echo.

:: Wait and update some services
timeout /t 5 /nobreak >nul

echo Services running for 5 seconds...
echo.

:: Wait more
timeout /t 5 /nobreak >nul

:: Complete some services at different times
echo Completing services one by one...

echo Completing Data Ingest...
curl -sS -X POST localhost:%PORT%/finish -H "Content-Type: application/json" -d "{\"id\":\"data-ingest\",\"ok\":true}"
echo.
timeout /t 2 /nobreak >nul

echo Completing Video Encode...
curl -sS -X POST localhost:%PORT%/finish -H "Content-Type: application/json" -d "{\"id\":\"video-encode\",\"ok\":true}"
echo.
timeout /t 2 /nobreak >nul

echo Failing Backup Sync (demo)...
curl -sS -X POST localhost:%PORT%/finish -H "Content-Type: application/json" -d "{\"id\":\"backup-sync\",\"ok\":false}"
echo.
timeout /t 2 /nobreak >nul

echo Completing AI Training...
curl -sS -X POST localhost:%PORT%/finish -H "Content-Type: application/json" -d "{\"id\":\"ai-training\",\"ok\":true}"
echo.

echo.
echo Demo completed! Configured slots should show different states.
echo Tap the completed keys to free up slots for new services.
echo.

:: Final status
echo Final slot status:
curl -sS localhost:%PORT%/slots
echo.