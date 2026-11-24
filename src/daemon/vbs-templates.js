/**
 * Antigravity 中文汉化补丁 v4.0 - 纯 ASCII VBScript 守护模板生成器
 *
 * 工程安全约束：
 * 1. 100% 纯 ASCII 字符集输出，彻底免疫不同 Windows 区域语言下的代码页乱码；
 * 2. 动态从 install_dir.txt 读取真实客户端安装目录，完美支持安装在 D/E/F 盘或 Program Files 的用户；
 * 3. 每一个 Sub / Function 第一行显式声明 On Error Resume Next（VBScript 异常捕获不跨过程继承）；
 * 4. 调用 ELECTRON_RUN_AS_NODE=1 后立即清除该环境变量，防止污染后续拉起的客户端窗口。
 */

'use strict';

const { PATCH_DICT_SIGNATURE } = require('../compiler.js');

function generateSharedVbsHelpers() {
  return `Sub WriteVbsLog(msg)
  On Error Resume Next
  Err.Clear
  If fso.FileExists(logFile) Then
    Dim lf
    Set lf = fso.GetFile(logFile)
    If Err.Number = 0 Then
      If lf.Size > 262144 Then
        fso.DeleteFile logFile, True
      End If
    End If
  End If
  Err.Clear
  Dim ts
  Set ts = fso.OpenTextFile(logFile, 8, True)
  If Err.Number = 0 Then
    ts.WriteLine "[" & Now() & "] [VBS] " & msg
    ts.Close
  End If
  Err.Clear
End Sub

Function ReadTextFile(filePath)
  On Error Resume Next
  Err.Clear
  ReadTextFile = ""
  If fso.FileExists(filePath) Then
    Dim ts
    Set ts = fso.OpenTextFile(filePath, 1, False)
    If Err.Number = 0 Then
      If Not ts.AtEndOfStream Then
        ReadTextFile = Trim(ts.ReadAll())
      End If
      ts.Close
    End If
  End If
  Err.Clear
End Function

Sub InitClientPaths()
  On Error Resume Next
  Err.Clear
  agDir = ReadTextFile(installDirFile)
  If agDir = "" Then
    agDir = fso.BuildPath(localAppData, "Programs\\Antigravity")
    If Not fso.FolderExists(agDir) Then
      agDir = fso.BuildPath(localAppData, "Programs\\antigravity")
    End If
  End If
  asarPath = fso.BuildPath(agDir, "resources\\app.asar")
  zhDeployJs = fso.BuildPath(agDir, "resources\\ag-zh-i18n.js")
  agExe = fso.BuildPath(agDir, "Antigravity.exe")
  lsExeV2 = fso.BuildPath(agDir, "resources\\bin\\language_server.exe")
  lsExeV1 = fso.BuildPath(agDir, "resources\\app\\extensions\\antigravity\\bin\\language_server_windows_x64.exe")
  uninstExe = fso.BuildPath(agDir, "Uninstall Antigravity.exe")
  Err.Clear
End Sub

Function NormalizeSig(rawVal)
  On Error Resume Next
  Err.Clear
  Dim s
  s = Trim(rawVal)
  s = Replace(s, vbCrLf, "|")
  s = Replace(s, vbCr, "|")
  s = Replace(s, vbLf, "|")
  NormalizeSig = s
  Err.Clear
End Function

Function IsFileLocked(filePath)
  On Error Resume Next
  Err.Clear
  IsFileLocked = False
  If filePath <> "" Then
    If fso.FileExists(filePath) Then
      Dim ts
      Set ts = fso.OpenTextFile(filePath, 8, False)
      If Err.Number <> 0 Then
        IsFileLocked = True
        Err.Clear
      Else
        ts.Close
      End If
    End If
  End If
  Err.Clear
End Function

Function IsAppRunning()
  On Error Resume Next
  Err.Clear
  IsAppRunning = False
  If IsFileLocked(agExe) Then
    IsAppRunning = True
    Exit Function
  End If
  If IsFileLocked(lsExeV2) Then
    IsAppRunning = True
    Exit Function
  End If
  If IsFileLocked(lsExeV1) Then
    IsAppRunning = True
    Exit Function
  End If
  Err.Clear
End Function

Function IsJunction(folderPath)
  On Error Resume Next
  Err.Clear
  IsJunction = False
  If fso.FolderExists(folderPath) Then
    Dim fld
    Set fld = fso.GetFolder(folderPath)
    If Err.Number = 0 Then
      If (fld.Attributes And 1024) <> 0 Then
        IsJunction = True
      End If
    End If
  End If
  Err.Clear
End Function

Function GetAsarSize()
  On Error Resume Next
  Err.Clear
  GetAsarSize = ""
  If fso.FileExists(asarPath) Then
    Dim f
    Set f = fso.GetFile(asarPath)
    If Err.Number = 0 Then
      GetAsarSize = CStr(f.Size)
    End If
  End If
  Err.Clear
End Function

Sub WaitForStableAsar()
  On Error Resume Next
  Err.Clear
  Dim prevSize, nowSize, i
  prevSize = GetAsarSize()
  For i = 1 To 20
    WScript.Sleep 250
    nowSize = GetAsarSize()
    If nowSize <> "" Then
      If nowSize = prevSize Then
        If CDbl(nowSize) > 1000000 Then
          Err.Clear
          Exit Sub
        End If
      End If
    End If
    prevSize = nowSize
  Next
  Err.Clear
End Sub

Function IsInstallComplete()
  On Error Resume Next
  Err.Clear
  IsInstallComplete = False
  If Not fso.FileExists(agExe) Then Exit Function
  If Not fso.FileExists(asarPath) Then Exit Function
  If Not fso.FileExists(uninstExe) Then Exit Function
  Dim sz
  sz = GetAsarSize()
  If sz = "" Then Exit Function
  If CDbl(sz) < 1000000 Then Exit Function
  If IsFileLocked(uninstExe) Then Exit Function
  IsInstallComplete = True
  Err.Clear
End Function

Function ResolveNodeHostExe()
  On Error Resume Next
  Err.Clear
  ResolveNodeHostExe = ""
  Dim p1, p2, rc
  p1 = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\\nodejs\\node.exe"
  If fso.FileExists(p1) Then
    ResolveNodeHostExe = p1
    Exit Function
  End If
  p2 = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\\Programs\\nodejs\\node.exe"
  If fso.FileExists(p2) Then
    ResolveNodeHostExe = p2
    Exit Function
  End If
  rc = shell.Run("cmd.exe /d /c where node.exe >nul 2>nul", 0, True)
  If Err.Number = 0 Then
    If rc = 0 Then
      ResolveNodeHostExe = "node.exe"
      Exit Function
    End If
  End If
  Err.Clear
End Function

Function CleanupOrphanedSidecarsIfMainExited()
  On Error Resume Next
  Err.Clear
  CleanupOrphanedSidecarsIfMainExited = False
  If Not IsFileLocked(agExe) Then
    Exit Function
  End If
  If IsFileLocked(lsExeV2) Or IsFileLocked(lsExeV1) Then
    Exit Function
  End If
  Dim wmi, procs, p, nm, cmdLower, epLower, hasMainOrLs, agDirLower, tick
  Dim orphanObjs(127), orphanCount, sidecarSeen, k, killedCount
  orphanCount = 0
  sidecarSeen = 0
  hasMainOrLs = False
  agDirLower = LCase(agDir)
  Set wmi = GetObject("winmgmts:{impersonationLevel=impersonate}!\\\\.\\root\\cimv2")
  If Err.Number <> 0 Or wmi Is Nothing Then
    Err.Clear
    Exit Function
  End If
  Set procs = wmi.ExecQuery("SELECT ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine FROM Win32_Process WHERE Name='Antigravity.exe' OR Name='language_server.exe' OR Name='language_server_windows_x64.exe' OR Name='cmd.exe'")
  If Err.Number <> 0 Then
    Err.Clear
    Exit Function
  End If
  For Each p In procs
    nm = LCase(CStr("" & p.Name))
    epLower = LCase(CStr("" & p.ExecutablePath))
    cmdLower = LCase(CStr("" & p.CommandLine))
    If nm = "language_server.exe" Or nm = "language_server_windows_x64.exe" Then
      If epLower = "" Or InStr(epLower, agDirLower) > 0 Then
        hasMainOrLs = True
        Exit For
      End If
    ElseIf nm = "antigravity.exe" Then
      If InStr(cmdLower, "sidecar_sdk") > 0 Then
        sidecarSeen = sidecarSeen + 1
        If orphanCount < 128 Then
          Set orphanObjs(orphanCount) = p
          orphanCount = orphanCount + 1
        End If
      ElseIf InStr(cmdLower, "src\\cli.js") = 0 And InStr(cmdLower, "src/cli.js") = 0 And InStr(cmdLower, "auto_heal_daemon.js") = 0 And InStr(cmdLower, "auto-heal-daemon.js") = 0 And InStr(cmdLower, "install_patch.js") = 0 And InStr(cmdLower, "uninstall_patch.js") = 0 And InStr(cmdLower, "doctor.js") = 0 And InStr(cmdLower, "install.js") = 0 Then
        hasMainOrLs = True
        Exit For
      End If
    ElseIf nm = "cmd.exe" Then
      If InStr(cmdLower, "agy-node.cmd") > 0 And InStr(cmdLower, "sidecar_sdk") > 0 Then
        If orphanCount < 128 Then
          Set orphanObjs(orphanCount) = p
          orphanCount = orphanCount + 1
        End If
      End If
    End If
  Next
  If hasMainOrLs Or sidecarSeen = 0 Then
    Err.Clear
    Exit Function
  End If
  killedCount = 0
  For k = 0 To orphanCount - 1
    Err.Clear
    orphanObjs(k).Terminate
    If Err.Number = 0 Then
      killedCount = killedCount + 1
    End If
    Err.Clear
  Next
  If killedCount > 0 Then
    Call WriteVbsLog("Terminated " & CStr(killedCount) & " orphaned sidecar process(es) releasing Antigravity.exe lock.")
    For tick = 1 To 12
      WScript.Sleep 50
      If Not IsAppRunning() Then Exit For
    Next
    CleanupOrphanedSidecarsIfMainExited = True
  End If
  Err.Clear
End Function

Function IsTargetInstallComplete(tDir)
  On Error Resume Next
  Err.Clear
  IsTargetInstallComplete = False
  If tDir = "" Then Exit Function
  If Not fso.FolderExists(tDir) Then Exit Function
  Dim tExe, tAsar, f
  tExe = fso.BuildPath(tDir, "Antigravity.exe")
  tAsar = fso.BuildPath(tDir, "resources\\app.asar")
  If Not fso.FileExists(tExe) Then Exit Function
  If Not fso.FileExists(tAsar) Then Exit Function
  Set f = fso.GetFile(tAsar)
  If Err.Number <> 0 Then
    Err.Clear
    Exit Function
  End If
  If CDbl(f.Size) < 1000000 Then Exit Function
  IsTargetInstallComplete = True
  Err.Clear
End Function

Sub RemoveDirWithRenameFallback(dirPath)
  On Error Resume Next
  Err.Clear
  If Not fso.FolderExists(dirPath) Then Exit Sub
  If IsJunction(dirPath) Then Exit Sub
  shell.Run "cmd.exe /d /c rd /s /q """ & dirPath & """", 0, True
  If fso.FolderExists(dirPath) Then
    If Not IsJunction(dirPath) Then
      Dim orphanShell
      orphanShell = dirPath & ".orphaned_" & CStr(CLng(Timer * 100))
      shell.Run "cmd.exe /d /c move """ & dirPath & """ """ & orphanShell & """", 0, True
      If fso.FolderExists(orphanShell) Then
        shell.Run "cmd.exe /d /c rd /s /q """ & orphanShell & """", 0, False
      End If
    End If
  End If
  Err.Clear
End Sub

Sub RepairJunctionIfNeeded()
  On Error Resume Next
  Err.Clear
  Dim targetDir, retry, partialShell
  targetDir = ReadTextFile(junctionFile)
  If targetDir = "" Then Exit Sub
  If LCase(targetDir) = LCase(agDir) Then Exit Sub
  If Not fso.FolderExists(agDir) Then
    If fso.FolderExists(targetDir) Then
      shell.Run "cmd.exe /d /c mklink /J """ & agDir & """ """ & targetDir & """", 0, True
      If IsJunction(agDir) Then
        Call WriteVbsLog("Restored missing Directory Junction: " & agDir & " -> " & targetDir)
      End If
    End If
    Err.Clear
    Exit Sub
  End If
  If IsJunction(agDir) Then Exit Sub

  partialShell = False
  If Not fso.FileExists(agExe) Or Not fso.FileExists(asarPath) Then
    If IsTargetInstallComplete(targetDir) Then
      partialShell = True
    End If
  End If

  If IsAppRunning() Then
    Call CleanupOrphanedSidecarsIfMainExited()
  End If
  If IsAppRunning() Then Exit Sub

  If Not partialShell Then
    If Not IsInstallComplete() Then Exit Sub
    Call WaitForStableAsar()
    If IsAppRunning() Then
      Call CleanupOrphanedSidecarsIfMainExited()
    End If
    If IsAppRunning() Then Exit Sub
    If Not IsInstallComplete() Then Exit Sub
    Call WriteVbsLog("Migrating unlinked directory " & agDir & " -> " & targetDir)
  Else
    Call WriteVbsLog("Cleaning orphaned shell directory and restoring Junction: " & agDir & " -> " & targetDir)
  End If

  If Not fso.FolderExists(targetDir) Then
    shell.Run "cmd.exe /d /c mkdir """ & targetDir & """", 0, True
  End If
  For retry = 1 To 15
    If IsJunction(agDir) Then Exit For
    If fso.FolderExists(agDir) Then
      shell.Run "robocopy.exe """ & agDir & """ """ & targetDir & """ /E /MOVE /XF app.asar.old *.evictprobe* *.testmove /R:2 /W:1 /MT:8 /NFL /NDL /NJH /NJS", 0, True
      Call RemoveDirWithRenameFallback(agDir)
    End If
    If Not fso.FolderExists(agDir) Then
      shell.Run "cmd.exe /d /c mklink /J """ & agDir & """ """ & targetDir & """", 0, True
    End If
    If IsJunction(agDir) Then
      Call WriteVbsLog("Successfully restored Directory Junction: " & agDir & " -> " & targetDir)
      Exit For
    End If
    WScript.Sleep 300
  Next
  Err.Clear
End Sub

Sub TriggerHeal(extraFlag)
  On Error Resume Next
  Err.Clear
  Dim procEnv, cmd, flagStr, sysNode
  flagStr = "daemon --once"
  If extraFlag <> "" Then
    flagStr = flagStr & " " & extraFlag
  End If
  Set procEnv = shell.Environment("Process")
  procEnv("ANTIGRAVITY_PATCH_NO_PAUSE") = "1"
  If fso.FolderExists(patchDir) Then
    shell.CurrentDirectory = patchDir
  End If
  sysNode = ResolveNodeHostExe()
  If sysNode <> "" Then
    procEnv.Remove "ELECTRON_RUN_AS_NODE"
    cmd = """" & sysNode & """ """ & cliJs & """ " & flagStr
    shell.Run cmd, 0, True
  ElseIf fso.FileExists(agExe) Then
    procEnv("ELECTRON_RUN_AS_NODE") = "1"
    cmd = """" & agExe & """ """ & cliJs & """ " & flagStr
    shell.Run cmd, 0, True
    procEnv.Remove "ELECTRON_RUN_AS_NODE"
  Else
    cmd = "node.exe """ & cliJs & """ " & flagStr
    shell.Run cmd, 0, True
  End If
  procEnv.Remove "ELECTRON_RUN_AS_NODE"
  procEnv.Remove "ANTIGRAVITY_PATCH_NO_PAUSE"
  Err.Clear
End Sub`;
}

function generateUpdateRunnerVbs() {
  return `' Antigravity Chinese Patch v4.0 - Synchronous Update Transaction Proxy (update_runner.vbs)
Option Explicit
On Error Resume Next

Dim fso, shell, appData, localAppData, userProfile, patchDir, installDirFile, agDir, asarPath, zhDeployJs, stateFile, junctionFile
Dim installerFile, relaunchFile, taskFile, runnerLockFile, vbsTxnLockFile, daemonLockFile, autoHealVbs, logFile
Dim cliJs, agExe, lsExeV2, lsExeV1, uninstExe, runnerLockStream, vbsTxnLockStream, lockTry

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

appData = shell.ExpandEnvironmentStrings("%APPDATA%")
localAppData = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
userProfile = shell.ExpandEnvironmentStrings("%USERPROFILE%")
patchDir = fso.BuildPath(appData, "AntigravityChinesePatch")
installDirFile = fso.BuildPath(patchDir, "install_dir.txt")
stateFile = fso.BuildPath(patchDir, "patched_state.txt")
junctionFile = fso.BuildPath(patchDir, "junction_target.txt")
installerFile = fso.BuildPath(patchDir, "active_installer.txt")
relaunchFile = fso.BuildPath(patchDir, "relaunch_requested.flag")
taskFile = fso.BuildPath(patchDir, "update_task.txt")
runnerLockFile = fso.BuildPath(patchDir, "runner.lock")
vbsTxnLockFile = fso.BuildPath(shell.ExpandEnvironmentStrings("%TEMP%"), "antigravity_vbs_txn.lock")
daemonLockFile = fso.BuildPath(patchDir, "daemon.lock")
autoHealVbs = fso.BuildPath(patchDir, "auto_heal.vbs")
logFile = fso.BuildPath(patchDir, "auto_heal.log")
cliJs = fso.BuildPath(patchDir, "src\\cli.js")

If fso.FolderExists(patchDir) Then
  shell.CurrentDirectory = patchDir
End If

For lockTry = 1 To 60
  Err.Clear
  Set runnerLockStream = fso.OpenTextFile(runnerLockFile, 8, True)
  If Err.Number = 0 Then Exit For
  WScript.Sleep 200
Next
If Err.Number <> 0 Then
  WScript.Quit 0
End If

For lockTry = 1 To 60
  Err.Clear
  Set vbsTxnLockStream = fso.OpenTextFile(vbsTxnLockFile, 8, True)
  If Err.Number = 0 Then Exit For
  WScript.Sleep 200
Next
If Err.Number <> 0 Then
  runnerLockStream.Close
  WScript.Quit 0
End If

${generateSharedVbsHelpers()}

Call InitClientPaths()

Sub ExecuteUpdateTransaction()
  On Error Resume Next
  Err.Clear
  Dim rawTask, lines, lineCount, installerExe, shouldRelaunch, extraArgs, initialDelayMs, forceCloseApp
  Dim waitTick, instCmd, instExitCode, cleanEnv

  rawTask = ReadTextFile(taskFile)
  If rawTask = "" Then
    Call WriteVbsLog("[Runner] Invoked without update_task.txt; exiting.")
    Exit Sub
  End If

  rawTask = Replace(rawTask, vbCrLf, vbLf)
  rawTask = Replace(rawTask, vbCr, vbLf)
  lines = Split(rawTask, vbLf)
  lineCount = UBound(lines)

  installerExe = ""
  shouldRelaunch = "1"
  extraArgs = ""
  initialDelayMs = 0
  forceCloseApp = "0"

  If lineCount >= 0 Then installerExe = Trim(lines(0))
  If lineCount >= 1 Then
    If Trim(lines(1)) = "0" Then shouldRelaunch = "0"
  End If
  If lineCount >= 2 Then extraArgs = Trim(lines(2))
  If lineCount >= 3 Then
    If IsNumeric(Trim(lines(3))) Then initialDelayMs = CLng(Trim(lines(3)))
  End If
  If lineCount >= 4 Then forceCloseApp = Trim(lines(4))

  If initialDelayMs > 0 Then
    WScript.Sleep initialDelayMs
  End If

  If forceCloseApp = "1" Then
    shell.Run "taskkill.exe /IM Antigravity.exe /T /F", 0, True
    shell.Run "taskkill.exe /IM language_server.exe /T /F", 0, True
    shell.Run "taskkill.exe /IM language_server_windows_x64.exe /T /F", 0, True
  End If

  For waitTick = 1 To 80
    If Not IsAppRunning() Then Exit For
    If waitTick = 6 Then
      Call CleanupOrphanedSidecarsIfMainExited()
      If Not IsAppRunning() Then Exit For
    End If
    WScript.Sleep 250
  Next
  If IsAppRunning() Then
    Call CleanupOrphanedSidecarsIfMainExited()
  End If
  If IsAppRunning() Then
    shell.Run "taskkill.exe /IM Antigravity.exe /T /F", 0, True
    shell.Run "taskkill.exe /IM language_server.exe /T /F", 0, True
    shell.Run "taskkill.exe /IM language_server_windows_x64.exe /T /F", 0, True
    For waitTick = 1 To 20
      If Not IsAppRunning() Then Exit For
      WScript.Sleep 250
    Next
  End If
  WScript.Sleep 350

  If installerExe <> "" Then
    If UCase(installerExe) <> "SKIP_INSTALL" Then
      If fso.FileExists(installerExe) Then
        instCmd = """" & installerExe & """ --updated /S"
        If extraArgs <> "" Then
          instCmd = instCmd & " " & extraArgs
        End If
        Call WriteVbsLog("[Runner] Starting silent NSIS update: " & instCmd)
        instExitCode = shell.Run(instCmd, 0, True)
        Call WriteVbsLog("[Runner] Silent NSIS update finished with exit code: " & CStr(instExitCode))
        For waitTick = 1 To 120
          If Not IsFileLocked(installerExe) Then
            If Not IsFileLocked(uninstExe) Then Exit For
          End If
          WScript.Sleep 400
        Next
        Call InitClientPaths()
        Call WaitForStableAsar()
      End If
    End If
  End If

  If IsAppRunning() Then
    shell.Run "taskkill.exe /IM Antigravity.exe /T /F", 0, True
    shell.Run "taskkill.exe /IM language_server.exe /T /F", 0, True
    shell.Run "taskkill.exe /IM language_server_windows_x64.exe /T /F", 0, True
    For waitTick = 1 To 20
      If Not IsAppRunning() Then Exit For
      WScript.Sleep 250
    Next
    shouldRelaunch = "1"
  End If

  Call RepairJunctionIfNeeded()
  Call TriggerHeal("--offline")

  If fso.FileExists(taskFile) Then fso.DeleteFile taskFile, True
  If fso.FileExists(installerFile) Then fso.DeleteFile installerFile, True
  If fso.FileExists(relaunchFile) Then fso.DeleteFile relaunchFile, True
  Err.Clear

  Set cleanEnv = shell.Environment("Process")
  cleanEnv.Remove "ELECTRON_RUN_AS_NODE"
  cleanEnv.Remove "ANTIGRAVITY_PATCH_NO_PAUSE"
  Err.Clear

  If shouldRelaunch = "1" Then
    If fso.FileExists(agExe) Then
      Call WriteVbsLog("[Runner] Update transaction complete. Launching localized Antigravity.exe")
      If fso.FolderExists(userProfile) Then
        shell.CurrentDirectory = userProfile
      End If
      shell.Run """" & agExe & """ --updated", 1, False
      If fso.FolderExists(patchDir) Then
        shell.CurrentDirectory = patchDir
      End If
    End If
  End If

  If fso.FileExists(autoHealVbs) Then
    If Not IsFileLocked(daemonLockFile) Then
      shell.Run "wscript.exe //B """ & autoHealVbs & """", 0, False
    End If
  End If
  Err.Clear
End Sub

Call ExecuteUpdateTransaction()
vbsTxnLockStream.Close
runnerLockStream.Close
WScript.Quit 0
`;
}

function generateAutoHealVbs() {
  return `' Antigravity Chinese Patch v4.0 - Silent Auto-Heal & Live CDP Localization Guardian (auto_heal.vbs)
Option Explicit
On Error Resume Next

Dim fso, shell, appData, localAppData, userProfile, patchDir, installDirFile, agDir, asarPath, zhDeployJs
Dim stateFile, guardianStateFile, verifiedCdpFile, devToolsPortFile, junctionFile
Dim installerFile, relaunchFile, taskFile, updateRunnerVbs, lockFile, runnerLockFile, vbsTxnLockFile, logFile
Dim cliJs, agExe, lsExeV2, lsExeV1, uninstExe
Dim lockStream, expectedSize, guardianSize, currentSize, needPatchHeal, lastFailedSize, failCount
Dim rawPortSig, normPortSig, desiredCdpSig, verifiedCdpSig, verifyFailSig, verifyFailCount
Dim loopTarget, loopSleepMs, stableCycles

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

appData = shell.ExpandEnvironmentStrings("%APPDATA%")
localAppData = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%")
userProfile = shell.ExpandEnvironmentStrings("%USERPROFILE%")
patchDir = fso.BuildPath(appData, "AntigravityChinesePatch")
installDirFile = fso.BuildPath(patchDir, "install_dir.txt")
stateFile = fso.BuildPath(patchDir, "patched_state.txt")
guardianStateFile = fso.BuildPath(patchDir, "guardian_state.txt")
verifiedCdpFile = fso.BuildPath(patchDir, "verified_cdp.txt")
devToolsPortFile = fso.BuildPath(appData, "Antigravity\\DevToolsActivePort")
junctionFile = fso.BuildPath(patchDir, "junction_target.txt")
installerFile = fso.BuildPath(patchDir, "active_installer.txt")
relaunchFile = fso.BuildPath(patchDir, "relaunch_requested.flag")
taskFile = fso.BuildPath(patchDir, "update_task.txt")
updateRunnerVbs = fso.BuildPath(patchDir, "update_runner.vbs")
lockFile = fso.BuildPath(patchDir, "daemon.lock")
runnerLockFile = fso.BuildPath(patchDir, "runner.lock")
vbsTxnLockFile = fso.BuildPath(shell.ExpandEnvironmentStrings("%TEMP%"), "antigravity_vbs_txn.lock")
logFile = fso.BuildPath(patchDir, "auto_heal.log")
cliJs = fso.BuildPath(patchDir, "src\\cli.js")
lastFailedSize = ""
failCount = 0
verifyFailSig = ""
verifyFailCount = 0
stableCycles = 0

If fso.FolderExists(patchDir) Then
  shell.CurrentDirectory = patchDir
End If

Err.Clear
Set lockStream = fso.OpenTextFile(lockFile, 8, True)
If Err.Number <> 0 Then
  WScript.Quit 0
End If

${generateSharedVbsHelpers()}

Call InitClientPaths()

Function IsInstallerRunning()
  On Error Resume Next
  Err.Clear
  IsInstallerRunning = False
  Dim instPath
  instPath = ReadTextFile(installerFile)
  If instPath <> "" Then
    If IsFileLocked(instPath) Then
      IsInstallerRunning = True
      Exit Function
    End If
  End If
  If fso.FileExists(uninstExe) Then
    If IsFileLocked(uninstExe) Then
      IsInstallerRunning = True
      Exit Function
    End If
  End If
  If instPath <> "" Then
    If Not IsFileLocked(agExe) Then
      fso.DeleteFile installerFile, True
      Err.Clear
    End If
  End If
  Err.Clear
End Function

Sub CheckRelaunchIfRequested()
  On Error Resume Next
  Err.Clear
  If IsFileLocked(runnerLockFile) Then Exit Sub
  If Not fso.FileExists(relaunchFile) Then Exit Sub
  If IsInstallerRunning() Then Exit Sub
  If IsAppRunning() Then Exit Sub
  Dim targetDir
  targetDir = ReadTextFile(junctionFile)
  If targetDir <> "" Then
    If LCase(targetDir) <> LCase(agDir) Then
      If Not IsJunction(agDir) Then Exit Sub
    End If
  End If
  Dim curSize, expSize, cleanEnv
  curSize = GetAsarSize()
  expSize = ReadTextFile(stateFile)
  If curSize = "" Or expSize = "" Or curSize <> expSize Then Exit Sub
  fso.DeleteFile relaunchFile, True
  Err.Clear
  Set cleanEnv = shell.Environment("Process")
  cleanEnv.Remove "ELECTRON_RUN_AS_NODE"
  cleanEnv.Remove "ANTIGRAVITY_PATCH_NO_PAUSE"
  Err.Clear
  If fso.FileExists(agExe) Then
    Call WriteVbsLog("Update + Chinese heal complete. Relaunching Antigravity.exe")
    If fso.FolderExists(userProfile) Then
      shell.CurrentDirectory = userProfile
    End If
    shell.Run """" & agExe & """", 1, False
    If fso.FolderExists(patchDir) Then
      shell.CurrentDirectory = patchDir
    End If
  End If
  Err.Clear
End Sub

Sub RunCheckCycle()
  On Error Resume Next
  Err.Clear
  Dim healLockStream, vbsTxnStream, jTarget
  Call InitClientPaths()
  If IsFileLocked(runnerLockFile) Then Exit Sub
  If IsFileLocked(vbsTxnLockFile) Then Exit Sub
  If IsInstallerRunning() Then Exit Sub

  jTarget = ReadTextFile(junctionFile)
  If jTarget <> "" Then
    If LCase(jTarget) <> LCase(agDir) Then
      If Not IsJunction(agDir) Then
        Err.Clear
        Set vbsTxnStream = fso.OpenTextFile(vbsTxnLockFile, 8, True)
        If Err.Number = 0 Then
          If IsAppRunning() Then
            Call CleanupOrphanedSidecarsIfMainExited()
          End If
          If Not IsAppRunning() Then
            Err.Clear
            Set healLockStream = fso.OpenTextFile(runnerLockFile, 8, True)
            If Err.Number = 0 Then
              Call RepairJunctionIfNeeded()
              healLockStream.Close
            End If
          End If
          vbsTxnStream.Close
        End If
        Err.Clear
      End If
    End If
  End If

  If Not IsInstallComplete() Then Exit Sub

  needPatchHeal = False
  currentSize = GetAsarSize()
  expectedSize = ReadTextFile(stateFile)
  guardianSize = ReadTextFile(guardianStateFile)

  If currentSize <> "" Then
    If expectedSize = "" Or currentSize <> expectedSize Or guardianSize = "" Or currentSize <> guardianSize Then
      needPatchHeal = True
    End If
  End If

  If Not fso.FileExists(zhDeployJs) Then
    needPatchHeal = True
  End If

  If needPatchHeal Then
    stableCycles = 0
    If currentSize <> "" And currentSize = lastFailedSize And failCount >= 8 Then
      WScript.Sleep 8000
    Else
      Call WaitForStableAsar()
      If Not IsFileLocked(runnerLockFile) And Not IsFileLocked(vbsTxnLockFile) Then
        If Not IsInstallerRunning() Then
          If IsInstallComplete() Then
            Err.Clear
            Set vbsTxnStream = fso.OpenTextFile(vbsTxnLockFile, 8, True)
            If Err.Number = 0 Then
              Err.Clear
              Set healLockStream = fso.OpenTextFile(runnerLockFile, 8, True)
              If Err.Number = 0 Then
                If Not IsAppRunning() Then
                  Call RepairJunctionIfNeeded()
                End If
                Call WriteVbsLog("Detected unpatched installation or manual update (AsarSize=" & currentSize & "). Triggering live heal...")
                Call TriggerHeal("--live")
                healLockStream.Close
              End If
              vbsTxnStream.Close
              Err.Clear
              expectedSize = ReadTextFile(stateFile)
              guardianSize = ReadTextFile(guardianStateFile)
              currentSize = GetAsarSize()
              If currentSize <> "" And currentSize = expectedSize And currentSize = guardianSize And fso.FileExists(zhDeployJs) Then
                lastFailedSize = ""
                failCount = 0
              Else
                If lastFailedSize = currentSize Then
                  failCount = failCount + 1
                Else
                  lastFailedSize = currentSize
                  failCount = 1
                End If
              End If
            End If
            Err.Clear
          End If
        End If
      End If
    End If
  End If

  Call CheckRelaunchIfRequested()

  If IsAppRunning() Then
    rawPortSig = ReadTextFile(devToolsPortFile)
    normPortSig = NormalizeSig(rawPortSig)
    If normPortSig <> "" Then
      desiredCdpSig = "${PATCH_DICT_SIGNATURE}|" & normPortSig
      verifiedCdpSig = ReadTextFile(verifiedCdpFile)
      If desiredCdpSig <> verifiedCdpSig Then
        If desiredCdpSig <> verifyFailSig Or verifyFailCount < 5 Then
          WScript.Sleep 900
          If IsAppRunning() And Not IsFileLocked(runnerLockFile) And Not IsFileLocked(vbsTxnLockFile) Then
            Call TriggerHeal("--verify-live")
            verifiedCdpSig = ReadTextFile(verifiedCdpFile)
            If verifiedCdpSig = desiredCdpSig Then
              verifyFailSig = ""
              verifyFailCount = 0
            Else
              If verifyFailSig = desiredCdpSig Then
                verifyFailCount = verifyFailCount + 1
              Else
                verifyFailSig = desiredCdpSig
                verifyFailCount = 1
              End If
            End If
          End If
        End If
      End If
    End If
  End If
  If stableCycles < 100 Then
    stableCycles = stableCycles + 1
  End If
  Err.Clear
End Sub

Call RunCheckCycle()

Do
  ' Adaptive low-power backoff: 1.5s on boot, 8s once healthy and stable
  If stableCycles >= 8 Then
    loopSleepMs = 8000
  Else
    loopSleepMs = 1500
  End If
  loopTarget = ReadTextFile(junctionFile)
  If loopTarget <> "" Then
    If LCase(loopTarget) <> LCase(agDir) Then
      If Not IsJunction(agDir) Then
        stableCycles = 0
        loopSleepMs = 400
      End If
    End If
  End If
  WScript.Sleep loopSleepMs
  Call RunCheckCycle()
Loop
`;
}

module.exports = {
  generateAutoHealVbs,
  generateUpdateRunnerVbs,
};
