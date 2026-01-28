@echo off
REM Script de inicialização rápida para Windows
REM Execute este arquivo para iniciar o sistema PDV/ERP

echo ========================================
echo   Sistema PDV/ERP Bomboniere
echo ========================================
echo.

echo Verificando ambiente...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Node.js nao encontrado!
    echo Instale em: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js instalado
echo.

echo Verificando MySQL...
sc query MySQL80 | find "RUNNING" >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] MySQL pode nao estar rodando
    echo Tente iniciar o servico MySQL manualmente
    echo.
) else (
    echo [OK] MySQL rodando
    echo.
)

echo ========================================
echo Iniciando servidor...
echo.
echo Sistema disponivel em: http://localhost:3000
echo.
echo Credenciais padrao:
echo   Email: admin@bomboniere.com
echo   Senha: @Bomboniere2025
echo.
echo ========================================
echo.

REM Aguardar 2 segundos
timeout /t 2 /nobreak >nul

REM Iniciar servidor em janela MINIMIZADA com titulo de aviso
start "SERVIDOR PDV - NAO FECHAR!" /MIN npm start

echo [!] Servidor iniciado em janela MINIMIZADA
echo [!] NAO FECHE a janela "SERVIDOR PDV - NAO FECHAR!"
echo.
echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

REM Abrir navegador
start http://localhost:3000

echo.
echo ========================================
echo    SISTEMA PRONTO!
echo ========================================
echo.
echo [!] Para PARAR o servidor: parar-servidor.bat
echo.
pause
