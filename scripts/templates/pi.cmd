@echo off
node "__REPOSITORY_ROOT__\dist\src\cli.js" safe %*
exit /b %ERRORLEVEL%
