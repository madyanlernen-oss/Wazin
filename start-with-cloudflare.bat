@echo off
chcp 65001 > nul
title تشغيل منصة تدبير - Tadbeer Cloudflare Launcher
echo ================================================================
echo           🌟 منصة تدبير - تشغيل الخادم مع نفق Cloudflare 🌟
echo ================================================================
echo.
echo [1/2] جاري تشغيل خادم التطبيق المحلي (Tadbeer Server) على المنفذ 3000...
start "Tadbeer Local Server" cmd /k "bun run server.ts"

echo [2/2] جاري تشغيل نفق Cloudflare Tunnel للربط الخارجي...
echo انتظر بضع ثوانٍ حتى يظهر لك رابط https://*.trycloudflare.com في النافذة.
echo انسخ الرابط وافتحه في المتصفح أو شاركه مع أصدقائك.
echo.
bunx --yes cloudflared tunnel --protocol http2 --url http://127.0.0.1:3000
pause
