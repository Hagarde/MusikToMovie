@echo off
setlocal
title MusikToMovie - Installation Complete Automatique

echo =================================================================
echo  MUSIKTOMOVIE - INSTALLATEUR TOUT-EN-UN (ORDI VIERGE)
echo =================================================================
echo.
echo Ce script va installer et configurer automatiquement :
echo  1. L'application Web (Node.js et dependances npm)
echo  2. Le moteur d'IA Demucs v4 (Python, PyTorch, FFmpeg, yt-dlp)
echo.
echo =================================================================
echo.

:: 1. Verification de Node.js
echo [1/4] Verification de Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Node.js n'est pas installe ou pas dans le PATH !
    echo Telechargez et installez Node.js LTS ici : https://nodejs.org/
    echo N'oubliez pas de redemarrer votre terminal apres installation.
    pause
    exit /b 1
)
echo [OK] Node.js detecte. Installation des modules npm en cours...
call npm install
if errorlevel 1 (
    echo [ERREUR] Erreur lors de npm install.
    pause
    exit /b 1
)
echo [OK] Dependances Web installees avec succes !
echo.

:: 2. Verification de Python
echo [2/4] Verification de Python...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installe ou pas dans le PATH !
    echo Telechargez Python ici : https://www.python.org/downloads/
    echo IMPORTANT : Cochez bien la case "Add python.exe to PATH" lors de l'installation !
    pause
    exit /b 1
)
echo [OK] Python detecte.
echo.

:: 3. Installation des dependances IA (PyTorch, Demucs, FFmpeg, yt-dlp)
echo [3/4] Installation du moteur d'IA Demucs v4 et des outils audio...
echo (Telechargement et configuration automatique, veuillez patienter...)
echo.

python -m pip install --upgrade pip
python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
python -m pip install demucs yt-dlp imageio-ffmpeg static-ffmpeg soundfile lameenc

if errorlevel 1 (
    echo [ERREUR] Erreur lors de l'installation des paquets Python.
    pause
    exit /b 1
)
echo [OK] Paquets Python et IA installes avec succes !
echo.

:: 4. Configuration automatique de FFmpeg
echo [4/4] Configuration de FFmpeg et verification finale...
python -c "import imageio_ffmpeg, os, shutil; exe = imageio_ffmpeg.get_ffmpeg_exe(); target = os.path.join(os.path.dirname(exe), 'ffmpeg.exe'); shutil.copyfile(exe, target) if not os.path.exists(target) else None; print('[OK] FFmpeg configure avec succes !')"

echo.
echo =================================================================
echo  INSTALLATION TERMINEE AVEC SUCCES ! TOUT EST PRET !
echo =================================================================
echo.
echo Pour utiliser MusikToMovie :
echo  - Double-cliquez sur "lancer_studio.bat" pour ouvrir le Studio de mixage
echo  - Double-cliquez sur "extraire_pistes.bat" pour separer une musique YouTube/MP3
echo  - Double-cliquez sur "synchroniser_supabase.bat" pour extraire tous les morceaux
echo.
pause
