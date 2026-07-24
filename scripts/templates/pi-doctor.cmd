@echo off
node "__REPOSITORY_ROOT__\dist\src\cli.js" doctor %*
exit /b %ERRORLEVEL%
