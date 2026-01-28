@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   PARAR SERVIDOR PDV BOMBONIERE
echo ========================================
echo.

REM Procurar processo Node.js na porta 3000
echo Procurando servidor na porta 3000...

FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') DO (
    SET PID=%%P
)

IF NOT DEFINED PID (
    echo [!] Nenhum servidor encontrado na porta 3000
    echo.
    pause
    exit /b 0
)

echo Processo encontrado: PID %PID%
echo.
echo [!] Tem certeza que deseja PARAR o servidor?
echo     (Isso vai FECHAR o sistema PDV para todos os usuarios!)
echo.
choice /C SN /M "Parar servidor? (S=Sim, N=Nao)"

IF %ERRORLEVEL% EQU 2 (
    echo.
    echo Operacao cancelada.
    pause
    exit /b 0
)

echo.
echo Parando servidor (PID %PID%)...
taskkill /F /PID %PID% >nul 2>&1

IF %ERRORLEVEL% EQU 0 (
    echo [OK] Servidor parado com sucesso!
) ELSE (
    echo [X] Erro ao parar servidor
    echo [!] Tente fechar manualmente a janela "SERVIDOR PDV"
)

echo.
pause
