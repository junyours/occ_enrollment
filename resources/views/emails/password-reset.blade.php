<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your password reset code</title>
</head>
<body style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#334155;line-height:1.6;">
    <table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff;">
        <tr>
            <td style="padding:28px 24px;background:#1e3a8a;color:#ffffff;text-align:center;">
                <h1 style="margin:0;font-size:22px;">Opol Community College</h1>
                <p style="margin:6px 0 0;font-size:12px;letter-spacing:2px;">ACCOUNT RECOVERY</p>
            </td>
        </tr>
        <tr>
            <td style="padding:32px 24px;">
                <h2 style="margin:0 0 16px;font-size:22px;color:#1e3a8a;">Your password reset code</h2>
                <p>Enter this six-digit code on the password recovery screen, then choose your new password.</p>
                <div style="margin:24px 0;padding:20px;background:#eff6ff;border:1px solid #bfdbfe;text-align:center;font-family:monospace;font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e3a8a;">{{ $code }}</div>
                <p>This code expires in <strong>{{ $expiresInMinutes }} minutes</strong> and can be used only once. If you request another code, use the most recent email.</p>
                <p style="padding:16px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;font-size:14px;">Keep this code private. College staff will never ask you to share it. If you did not request a password change, you can ignore this email. Your password has not changed.</p>
                <p style="font-size:14px;color:#64748b;">Return to the same browser where you requested the code. This email does not contain a password reset link.</p>
            </td>
        </tr>
        <tr>
            <td style="padding:20px 24px;border-top:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px;">&copy; {{ date('Y') }} Opol Community College<br>Opol, Misamis Oriental, Philippines</td>
        </tr>
    </table>
</body>
</html>
