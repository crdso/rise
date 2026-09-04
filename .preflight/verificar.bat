@echo off
chcp 65001 >nul
title RISE - verificacao do preflight (somente leitura)

REM ============================================================
REM  Este script NAO altera o repositorio.
REM  Nao faz add, commit, push, checkout, reset nem stash.
REM  Ele so LE o estado e roda as verificacoes, gravando tudo em
REM  .preflight\output.txt para o Claude ler.
REM  Depois de usar, a pasta .preflight inteira pode ser apagada.
REM ============================================================

set "REPO=%~dp0.."
set "OUT=%~dp0output.txt"

cd /d "%REPO%" || (echo Pasta do repositorio nao encontrada. & pause & exit /b 1)

echo Rodando verificacoes... isso pode levar alguns minutos.
echo A saida esta sendo gravada em .preflight\output.txt
echo.

echo ===== ambiente ===== > "%OUT%" 2>&1
echo pasta: %CD% >> "%OUT%" 2>&1
call node --version >> "%OUT%" 2>&1
call npm --version >> "%OUT%" 2>&1
call git --version >> "%OUT%" 2>&1

echo. >> "%OUT%" 2>&1
echo ===== git status ===== >> "%OUT%" 2>&1
git status --short --branch >> "%OUT%" 2>&1

echo. >> "%OUT%" 2>&1
echo ===== git diff --stat ===== >> "%OUT%" 2>&1
git diff --stat >> "%OUT%" 2>&1

echo. >> "%OUT%" 2>&1
echo ===== git log -3 ===== >> "%OUT%" 2>&1
git log --oneline -3 >> "%OUT%" 2>&1

echo [1/3] type-check...
echo. >> "%OUT%" 2>&1
echo ===== tsc --noEmit ===== >> "%OUT%" 2>&1
call npx --no-install tsc --noEmit >> "%OUT%" 2>&1
echo (exit code tsc: %ERRORLEVEL%) >> "%OUT%" 2>&1

echo [2/3] lint...
echo. >> "%OUT%" 2>&1
echo ===== npm run lint ===== >> "%OUT%" 2>&1
call npm run lint >> "%OUT%" 2>&1
echo (exit code lint: %ERRORLEVEL%) >> "%OUT%" 2>&1

echo [3/3] build...
echo. >> "%OUT%" 2>&1
echo ===== npm run build ===== >> "%OUT%" 2>&1
call npm run build >> "%OUT%" 2>&1
echo (exit code build: %ERRORLEVEL%) >> "%OUT%" 2>&1

echo. >> "%OUT%" 2>&1
echo ===== FIM ===== >> "%OUT%" 2>&1

echo.
echo Pronto. Volte no chat e avise que terminou.
pause
