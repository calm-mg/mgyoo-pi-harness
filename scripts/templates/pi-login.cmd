@echo off
node "__REPOSITORY_ROOT__\dist\src\cli.js" login %*
exit /b %ERRORLEVEL%
