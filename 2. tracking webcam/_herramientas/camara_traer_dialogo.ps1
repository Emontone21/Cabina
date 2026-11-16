# Trae al frente la ventana "Propiedades de ..." que abre ffmpeg (-show_video_device_dialog) y la ubica en 200,120.
Start-Sleep -Seconds 2
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class WD { public delegate bool EnumProc(IntPtr h, IntPtr l);
[DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc f, IntPtr l);
[DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
[DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
[DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
[DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr a, int x, int y, int cx, int cy, uint f); }
"@
$ids = (Get-Process ffmpeg -ErrorAction SilentlyContinue).Id
$script:h = $null
[WD]::EnumWindows({ param($w,$l) $p=0; [void][WD]::GetWindowThreadProcessId($w,[ref]$p); if ($ids -contains $p) { $sb=New-Object Text.StringBuilder 256; [void][WD]::GetWindowText($w,$sb,256); if ($sb.ToString() -like 'Propiedades*') { $script:h = $w } }; $true }, [IntPtr]::Zero) | Out-Null
if ($script:h) { [void][WD]::ShowWindow($script:h, 9); [void][WD]::SetWindowPos($script:h, [IntPtr]::Zero, 200, 120, 0, 0, 0x0005); [void][WD]::SetForegroundWindow($script:h); "dialogo al frente" } else { "no encontre el dialogo" }
