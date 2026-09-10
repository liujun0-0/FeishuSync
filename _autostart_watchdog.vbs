' VBS wrapper for Windows startup — launches FeishuSync watchdog
' without opening a console window. More compatible than .cmd on
' some Windows configurations where startup .cmd scripts are blocked.
'
' Usage: Copy this file to the Windows Startup folder:
'   shell:startup
'
' Or create a shortcut pointing to this file.

Dim shell, fso, scriptDir, scriptPath

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this VBS file lives
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
scriptPath = fso.BuildPath(scriptDir, "_autostart_watchdog.cmd")

' Run the .cmd silently (window hidden, don't wait for completion)
shell.Run """" & scriptPath & """", 0, False

Set shell = Nothing
Set fso = Nothing
