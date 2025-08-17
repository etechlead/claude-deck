@echo off
setlocal enabledelayedexpansion

:: Set default port to 17880 if no argument provided
set PORT=%1
if "%PORT%"=="" set PORT=17880

echo Testing slot overflow (more services than available slots)...
echo Port: %PORT%
echo.

:: Start 4 services to fill test slots
echo Starting 4 services to fill test slots...
curl -sS -X POST localhost:%PORT%/start -H "Content-Type: application/json" -d "{\"id\":\"service-1\",\"name\":\"Service 1\"}"
curl -sS -X POST localhost:%PORT%/start -H "Content-Type: application/json" -d "{\"id\":\"service-2\",\"name\":\"Service 2\"}"
curl -sS -X POST localhost:%PORT%/start -H "Content-Type: application/json" -d "{\"id\":\"service-3\",\"name\":\"Service 3\"}"
curl -sS -X POST localhost:%PORT%/start -H "Content-Type: application/json" -d "{\"id\":\"service-4\",\"name\":\"Service 4\"}"
echo.

echo Current status (should show busy slots):
curl -sS localhost:%PORT%/slots
echo.
echo.

:: Try to start a 5th service - should fail
echo Attempting to start 5th service (should fail)...
curl -sS -X POST localhost:%PORT%/start -H "Content-Type: application/json" -d "{\"id\":\"service-5\",\"name\":\"Service 5 (Overflow)\"}"
echo.
echo.

:: Complete one service to free a slot
echo Completing one service to free a slot...
curl -sS -X POST localhost:%PORT%/finish -H "Content-Type: application/json" -d "{\"id\":\"service-1\",\"ok\":true}"
echo.

:: Now try the 5th service again - should succeed
echo Attempting 5th service again (should succeed now)...
curl -sS -X POST localhost:%PORT%/start -H "Content-Type: application/json" -d "{\"id\":\"service-5\",\"name\":\"Service 5 (Success)\"}"
echo.

echo Final status:
curl -sS localhost:%PORT%/slots
echo.

echo Demo shows slot management: overflow handling and slot reuse when all configured slots are busy.