@echo off
chcp 65001 > nul
title MusikToMovie - Séparation Locale de Pistes Studio (Demucs v4)

echo =================================================================
echo 🎛️  MUSIKTOMOVIE - EXTRACTEUR LOCAL DE STEMS STUDIO
echo =================================================================
echo.
echo Ce script va telecharger la musique (si lien YouTube) et separer
echo les 4 pistes (Voix, Batterie, Basse, Melodie) en qualite Studio.
echo.

python scripts\extract_stems_local.py

echo.
pause
