@echo off
setlocal

REM ====================================================================
REM  Gera o ping-agente.exe distribuivel.
REM
REM  Saida: dist\ping-agente.exe (single-file, sem console, com tray + wizard)
REM ====================================================================

echo.
echo === Limpando builds anteriores ===
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build
if exist ping-agente.spec del /q ping-agente.spec

echo.
echo === Instalando dependencias ===
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo Erro ao instalar dependencias.
    exit /b 1
)

echo.
echo === Empacotando com PyInstaller ===
pyinstaller ^
    --onefile ^
    --noconsole ^
    --clean ^
    --name=ping-agente ^
    --hidden-import=tkinter ^
    --hidden-import=tkinter.ttk ^
    --hidden-import=tkinter.messagebox ^
    --hidden-import=PIL._tkinter_finder ^
    --collect-submodules=pystray ^
    --collect-submodules=PIL ^
    agente.py
if errorlevel 1 (
    echo Erro no PyInstaller.
    exit /b 1
)

REM Remove a pasta intermediaria, deixando apenas o .exe em dist\
if exist build rmdir /s /q build
if exist ping-agente.spec del /q ping-agente.spec

echo.
echo ====================================================================
echo  Build concluido.
echo  Executavel: dist\ping-agente.exe
echo.
echo  Para distribuir, copie apenas esse unico arquivo para o cliente.
echo  Na primeira execucao ele abre o assistente de configuracao e ja
echo  se registra no autostart do Windows.
echo ====================================================================
echo.
pause
endlocal
