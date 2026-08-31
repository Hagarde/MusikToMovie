@echo off
setlocal
title MusikToMovie - Lancement du Studio

echo =================================================================
echo  MUSIKTOMOVIE - DEMARRAGE DU STUDIO DE MIXAGE
echo =================================================================
echo.
echo Verification de l'environnement...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe ou pas dans le PATH !
    echo Telechargez et installez Node.js LTS ici : https://nodejs.org/
    pause
    exit /b 1
)

if not exist node_modules (
    echo [INFO] Les dependances ne sont pas installees. Installation en cours...
    call npm install
    if errorlevel 1 (
        echo [ERREUR] Erreur lors de npm install.
        pause
        exit /b 1
    )
)

echo.
echo Lancement du serveur Vite...
echo Le navigateur s'ouvrira automatiquement des que le serveur sera pret.
echo.

npx vite --open
