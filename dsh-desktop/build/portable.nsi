; dsh-desktop portable 自定义 NSIS 脚本（缓存加速）
; 命中 %LOCALAPPDATA%\dsh-desktop-cache 时直接运行缓存中的应用，跳过 7z 自解压；
; 未命中（或存在 rebuild.flag 表示版本失效）时按官方流程解压运行。
; 应用退出前会把解压目录播种进缓存（见 electron/main.js seedPortableCache）。
;
; 注意：electron-builder portable 目标不支持 include/script 选项，
; 本文件通过 scripts/patch-portable-nsi.sh 在构建前替换
; node_modules/app-builder-lib/templates/nsis/portable.nsi 生效。

!include "common.nsh"
!include "extractAppPackage.nsh"

CRCCheck off
WindowIcon Off
AutoCloseWindow True
RequestExecutionLevel ${REQUEST_EXECUTION_LEVEL}

Var CACHE_DIR
Var USE_CACHE

Function .onInit
  !ifndef SPLASH_IMAGE
    SetSilent silent
  !endif

  ; 缓存目录：%LOCALAPPDATA%\dsh-desktop-cache
  StrCpy $CACHE_DIR "$LOCALAPPDATA\dsh-desktop-cache"
  StrCpy $USE_CACHE 0
  ; 命中条件：缓存 exe 存在 且 无 rebuild.flag（版本未失效）
  IfFileExists "$CACHE_DIR\${APP_EXECUTABLE_FILENAME}" 0 cacheCheckDone
    IfFileExists "$CACHE_DIR\rebuild.flag" cacheCheckDone 0
      StrCpy $USE_CACHE 1
  cacheCheckDone:

  !insertmacro check64BitAndSetRegView
FunctionEnd

Function .onGUIInit
  InitPluginsDir

  !ifdef SPLASH_IMAGE
    File /oname=$PLUGINSDIR\splash.bmp "${SPLASH_IMAGE}"
    BgImage::SetBg $PLUGINSDIR\splash.bmp
    BgImage::Redraw
  !endif
FunctionEnd

Section
  !ifdef SPLASH_IMAGE
    HideWindow
  !endif

  ; —— 命中缓存：直接运行缓存中的应用，跳过解压 ——
  ${if} $USE_CACHE == 1
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_DIR", "$EXEDIR").r0'
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_FILE", "$EXEPATH").r0'
    System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_APP_FILENAME", "${APP_FILENAME}").r0'
    ${StdUtils.GetAllParameters} $R0 0

    !ifdef SPLASH_IMAGE
      BgImage::Destroy
    !endif

    ExecWait "$CACHE_DIR\${APP_EXECUTABLE_FILENAME} $R0" $0
    SetErrorLevel $0
    SetOutPath $EXEDIR
    Goto sectionDone
  ${endIf}

  ; —— 未命中缓存：官方解压流程 ——
  StrCpy $INSTDIR "$PLUGINSDIR\app"
  !ifdef UNPACK_DIR_NAME
    StrCpy $INSTDIR "$TEMP\${UNPACK_DIR_NAME}"
  !endif

  RMDir /r $INSTDIR
  SetOutPath $INSTDIR

  !ifdef APP_DIR_64
    !ifdef APP_DIR_ARM64
      !ifdef APP_DIR_32
        ${if} ${IsNativeARM64}
          File /r "${APP_DIR_ARM64}\*.*"
        ${elseif} ${RunningX64}
          File /r "${APP_DIR_64}\*.*"
        ${else}
          File /r "${APP_DIR_32}\*.*"
        ${endIf}
      !else
        ${if} ${IsNativeARM64}
          File /r "${APP_DIR_ARM64}\*.*"
        ${else}
          File /r "${APP_DIR_64}\*.*"
        ${endIf}
      !endif
    !else
      !ifdef APP_DIR_32
        ${if} ${RunningX64}
          File /r "${APP_DIR_64}\*.*"
        ${else}
          File /r "${APP_DIR_32}\*.*"
        ${endIf}
      !else
        File /r "${APP_DIR_64}\*.*"
      !endif
    !endif
  !else
    !ifdef APP_DIR_32
      File /r "${APP_DIR_32}\*.*"
    !else
      !insertmacro extractEmbeddedAppPackage
    !endif
  !endif

  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_DIR", "$EXEDIR").r0'
  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_FILE", "$EXEPATH").r0'
  System::Call 'Kernel32::SetEnvironmentVariable(t, t)i ("PORTABLE_EXECUTABLE_APP_FILENAME", "${APP_FILENAME}").r0'
  ${StdUtils.GetAllParameters} $R0 0

  !ifdef SPLASH_IMAGE
    BgImage::Destroy
  !endif

  ExecWait "$INSTDIR\${APP_EXECUTABLE_FILENAME} $R0" $0
  SetErrorLevel $0

  SetOutPath $EXEDIR
  RMDir /r $INSTDIR
sectionDone:
SectionEnd
