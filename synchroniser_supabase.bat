@echo off
setlocal
chcp 65001 > nul
title MusikToMovie - Synchronisation Supabase Stems

echo =================================================================
echo 🔄 SYNCHRONISATION SUPABASE - EXTRACTION BATCH DEMUCS V4
echo =================================================================
echo.
echo Ce script va :
echo  1. Se connecter a votre base Supabase
echo  2. Recuperer tous les morceaux et liens YouTube enregistres
echo  3. Telecharger et separer automatiquement les 4 pistes Studio
echo.
echo =================================================================
echo.

python scripts\sync_supabase_stems.py

if %errorlevel% neq 0 (
    echo.
    echo ⚠️ Une erreur est survenue lors de l'execution du script.
    pause
    exit /b 1
)

echo.
echo Appuyez sur une touche pour quitter...
pause > nul
