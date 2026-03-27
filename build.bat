@echo off

REM 设置测试环境变量
set PRE_VERSION=1.0.11-alpha.0
set VAR_MAIN_VERSION=1.0.12
set CI_COMMIT_REF_NAME=main

REM 输出环境变量
echo Environment:
echo - PRE_VERSION: %PRE_VERSION%
echo - VAR_MAIN_VERSION: %VAR_MAIN_VERSION%
echo - CI_COMMIT_REF_NAME: %CI_COMMIT_REF_NAME%

REM 提取PRE_VERSION的基础版本号（去除-release或-alpha后缀）
set PRE_BASE_VERSION=%PRE_VERSION%

REM 修复版本提取逻辑 - 直接使用for循环提取
for /f "tokens=1 delims=-" %%a in ("%PRE_VERSION%") do set PRE_BASE_VERSION=%%a

echo PRE_BASE_VERSION: %PRE_BASE_VERSION%

REM 解析版本号
for /f "tokens=1-3 delims=." %%a in ("%PRE_BASE_VERSION%") do (
    set "PRE_MAJOR=%%a"
    set "PRE_MINOR=%%b"
    set "PRE_PATCH=%%c"
)

for /f "tokens=1-3 delims=." %%a in ("%VAR_MAIN_VERSION%") do (
    set "VAR_MAJOR=%%a"
    set "VAR_MINOR=%%b"
    set "VAR_PATCH=%%c"
)

REM 确保版本号变量有值
if "%PRE_MAJOR%"=="" set PRE_MAJOR=0
if "%PRE_MINOR%"=="" set PRE_MINOR=0
if "%PRE_PATCH%"=="" set PRE_PATCH=0
if "%VAR_MAJOR%"=="" set VAR_MAJOR=0
if "%VAR_MINOR%"=="" set VAR_MINOR=0
if "%VAR_PATCH%"=="" set VAR_PATCH=0

echo Version breakdown:
echo - PRE: %PRE_MAJOR%.%PRE_MINOR%.%PRE_PATCH%
echo - VAR: %VAR_MAJOR%.%VAR_MINOR%.%VAR_PATCH%

REM 比较版本号
set IS_GREATER=0
if %VAR_MAJOR% gtr %PRE_MAJOR% (
    set IS_GREATER=1
) else if %VAR_MAJOR% equ %PRE_MAJOR% (
    if %VAR_MINOR% gtr %PRE_MINOR% (
        set IS_GREATER=1
    ) else if %VAR_MINOR% equ %PRE_MINOR% (
        if %VAR_PATCH% gtr %PRE_PATCH% (
            set IS_GREATER=1
        )
    )
)

echo IS_GREATER: %IS_GREATER%

REM 执行版本升级命令
if "%CI_COMMIT_REF_NAME%"=="main" (
    if "%IS_GREATER%"=="1" (
        echo Running: version-patch-release
        call npm run version-patch-release
    ) else (
        echo Running: version-release
        call npm run version-release
    )
) else (
    if "%IS_GREATER%"=="1" (
        echo Running: version-patch-alpha
        call npm run version-patch-alpha
    ) else (
        echo Running: version-alpha
        call npm run version-alpha
    )
)

echo Build completed
