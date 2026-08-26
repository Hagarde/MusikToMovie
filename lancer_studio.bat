@echo off
setlocal
chcp 65001 > nul
title MusikToMovie - Lancement du Studio

echo =================================================================
echo 🎧 MUSIKTOMOVIE - DEMARRAGE DU STUDIO DE MIXAGE
echo =================================================================
echo.
echo Ouverture de votre navigateur sur http://localhost:5173...
echo.

:: Ouvre l'URL dans le navigateur par defaut apres 2 secondes
start "" "http://localhost:5173"

:: Lance le serveur Vite en local
npm run dev
