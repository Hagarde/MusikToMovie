@echo off
setlocal
title MusikToMovie - Lancement du Studio

echo =================================================================
echo  MUSIKTOMOVIE - DEMARRAGE DU STUDIO DE MIXAGE
echo =================================================================
echo.
echo Ouverture de votre navigateur sur http://localhost:5173...
echo.

start "" "http://localhost:5173"

npm run dev
