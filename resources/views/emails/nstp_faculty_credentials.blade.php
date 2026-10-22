<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your NSTP Faculty Account</title>
</head>

<body style="margin:0; padding:0; background-color:#f3f6fa; color:#243247; font-family:Arial,Helvetica,sans-serif; line-height:1.6;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f3f6fa;">
        <tr>
            <td align="center" style="padding:28px 12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#ffffff; border:1px solid #dce4ee; border-radius:8px;">
                    <tr>
                        <td style="padding:26px 28px; background-color:#173b63; color:#ffffff;">
                            <p style="margin:0 0 6px; font-size:13px; letter-spacing:1px;">OPOL COMMUNITY COLLEGE</p>
                            <h1 style="margin:0; font-size:23px; line-height:1.3;">NSTP Faculty Access</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px;">
                            <p style="margin:0 0 16px; font-size:18px; font-weight:bold;">Hello, {{ $faculty['first_name'] }}!</p>
                            <p style="margin:0 0 22px;">Your NSTP faculty account is ready. Use the ID number and temporary password below to sign in.</p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f5fb; border:1px solid #d5e2f0; border-radius:6px;">
                                <tr>
                                    <td style="padding:18px 20px 6px; font-size:12px; color:#456489;">ID NUMBER / USERNAME</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 20px 18px; font-family:Consolas,'Courier New',monospace; font-size:20px; font-weight:bold; word-break:break-all;">{{ $faculty['user_id_no'] }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 20px 6px; font-size:12px; color:#456489;">TEMPORARY PASSWORD</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 20px 18px; font-family:Consolas,'Courier New',monospace; font-size:20px; font-weight:bold; word-break:break-all;">{{ $password }}</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 20px 6px; font-size:12px; color:#456489;">REGISTERED EMAIL</td>
                                </tr>
                                <tr>
                                    <td style="padding:0 20px 18px; font-size:15px; word-break:break-all;">{{ $faculty['email'] }}</td>
                                </tr>
                            </table>

                            <p style="margin:22px 0; font-size:14px; color:#526174;">Keep these credentials private and change your temporary password after signing in.</p>
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="background-color:#173b63; border-radius:5px;">
                                        <a href="{{ rtrim(config('app.url'), '/') . '/login' }}" style="display:inline-block; padding:13px 24px; color:#ffffff; text-decoration:none; font-weight:bold;">Sign in to your account</a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin:22px 0 0; font-size:13px; color:#526174;">If you were not expecting this account, contact the NSTP administrator.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 28px; border-top:1px solid #e6edf5; font-size:12px; color:#69788b;">
                            &copy; {{ date('Y') }} Opol Community College<br>
                            This is an automated account notification. Please do not reply.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>

</html>