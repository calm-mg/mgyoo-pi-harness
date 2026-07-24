@echo off
node "__REPOSITORY_ROOT__\dist\src\cli.js" update %*
exit /b %ERRORLEVEL%
