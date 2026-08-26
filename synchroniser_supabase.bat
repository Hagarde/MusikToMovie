@echo off
setlocal
title MusikToMovie - Synchronisation Supabase Stems

echo =================================================================
echo  SYNCHRONISATION SUPABASE - EXTRACTION BATCH DEMUCS V4
echo =================================================================
echo.
echo Ce script va :
echo  1. Se connecter a votre base Supabase
echo  2. Recuperer tous les morceaux et liens YouTube enregistres
echo  3. Telecharger et separer automatiquement les 4 pistes Studio
echo.
echo =================================================================
echo.

python "%~dp0scripts\sync_supabase_stems.py"

if errorlevel 1 (
    echo.
    echo [ERREUR] Une erreur est survenue lors de l'execution du script.
    echo.
    pause
    exit /b 1
)

echo.
echo [SUCCES] Synchronisation terminee. Appuyez sur une touche pour quitter.
pause > nul
