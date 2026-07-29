@echo off
REM ============================================
REM 智析 BrainMatch — 开发环境安全启动脚本
REM 解决 Windows 下 webpack 缓存损坏导致前端白屏问题
REM ============================================

echo [1/3] 清理残留进程...
taskkill //F //IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo   已清除残留 node 进程
) else (
    echo   无残留进程
)

echo [2/3] 清理 webpack 缓存...
if exist .next\cache (
    rd /s /q .next\cache
    echo   已删除 .next\cache
)
if exist .next\server\vendor-chunks (
    rd /s /q .next\server\vendor-chunks
    echo   已删除 vendor chunks
)

echo [3/3] 启动开发服务器...
call npm run dev
