@echo off
setlocal
title MusikToMovie - Separation Locale de Pistes Studio

echo =================================================================
echo  MUSIKTOMOVIE - EXTRACTEUR LOCAL DE STEMS STUDIO (DEMUCS V4)
echo =================================================================
echo.
echo Ce script telecharge la musique et separe les 4 pistes
echo (Voix, Batterie, Basse, Melodie) en qualite Studio.
echo.

python "%~dp0scripts\extract_stems_local.py"

echo.
pause
