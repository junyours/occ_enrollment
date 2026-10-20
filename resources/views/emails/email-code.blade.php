<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Confirm your new email</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #334155;
            margin: 0;
            padding: 0;
            background-color: #f1f5f9;
        }

        .wrapper {
            width: 100%;
            background-color: #f1f5f9;
            padding: 40px 0;
        }

        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .header {
            background-color: #1e3a8a;
            padding: 36px 20px 32px;
            text-align: center;
            color: #ffffff;
        }

        .icon {
            width: 56px;
            height: 56px;
            line-height: 56px;
            margin: 0 auto 16px;
            border-radius: 50%;
            background-color: rgba(255, 255, 255, 0.15);
            font-size: 26px;
            text-align: center;
        }

        .school-name {
            font-size: 22px;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 0;
            text-transform: uppercase;
        }

        .sub-header {
            font-size: 13px;
            opacity: 0.8;
            margin: 6px 0 0;
            letter-spacing: 2px;
        }

        .content {
            padding: 40px 32px 32px;
        }

        h1 {
            color: #1e3a8a;
            margin: 0 0 16px;
            font-size: 24px;
            line-height: 1.3;
        }

        p {
            margin: 0 0 16px;
        }

        .lead {
            font-size: 16px;
            color: #475569;
        }

        /* Code */
        .code-card {
            background-color: #eff6ff;
            border: 2px dashed #93c5fd;
            border-radius: 10px;
            padding: 26px 16px 22px;
            margin: 28px 0;
            text-align: center;
        }

        .code-label {
            display: block;
            font-size: 12px;
            font-weight: bold;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
        }

        .code {
            font-family: Menlo, Consolas, 'Courier New', monospace;
            font-size: 40px;
            font-weight: 700;
            letter-spacing: 12px;
            padding-left: 12px;
            color: #1e3a8a;
            line-height: 1.2;
        }

        .expiry {
            display: inline-block;
            margin-top: 16px;
            padding: 4px 14px;
            border-radius: 999px;
            background-color: #dbeafe;
            color: #1e3a8a;
            font-size: 13px;
        }

        /* Steps */
        .section-title {
            font-size: 12px;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin: 32px 0 12px;
        }

        .steps {
            width: 100%;
            border-collapse: collapse;
        }

        .steps td {
            padding: 6px 0;
            vertical-align: top;
            font-size: 15px;
            color: #475569;
        }

        .step-num {
            width: 32px;
        }

        .step-num span {
            display: inline-block;
            width: 24px;
            height: 24px;
            line-height: 24px;
            border-radius: 50%;
            background-color: #1e3a8a;
            color: #ffffff;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
        }

        /* Notice boxes */
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px 20px;
            margin: 16px 0 0;
        }

        .info-box.warning {
            background-color: #fffbeb;
            border-color: #fde68a;
            margin-top: 28px;
        }

        .info-title {
            display: block;
            font-size: 12px;
            font-weight: bold;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .info-content {
            font-size: 14px;
            color: #64748b;
            margin: 0;
        }

        .info-box.warning .info-title,
        .info-box.warning .info-content {
            color: #92400e;
        }

        .footer {
            text-align: center;
            padding: 28px 20px;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
        }

        @media screen and (max-width: 600px) {
            .wrapper {
                padding: 0;
            }

            .container {
                border-radius: 0;
            }

            .content {
                padding: 30px 20px 24px;
            }

            .code {
                font-size: 30px;
                letter-spacing: 7px;
                padding-left: 7px;
            }
        }
    </style>
</head>

<body>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        Your verification code is {{ $code }}. It expires in {{ $expiresInMinutes }} minutes.
    </div>

    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="icon">✉️</div>
                <p class="school-name">Opol Community College</p>
                <p class="sub-header">ACCOUNT SECURITY</p>
            </div>

            <div class="content">
                <h1>Confirm your new email</h1>

                <p class="lead">
                    You requested to use this address for your Opol Community College SIS account.
                    Enter the code below to confirm it.
                </p>

                <div class="code-card">
                    <span class="code-label">Verification code</span>
                    <div class="code">{{ $code }}</div>
                    <span class="expiry">⏱ Expires in <strong>{{ $expiresInMinutes }} minutes</strong></span>
                </div>

                <p class="section-title">What to do next</p>
                <table class="steps" role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                        <td class="step-num"><span>1</span></td>
                        <td>Go back to the <strong>Email settings</strong> page in the SIS.</td>
                    </tr>
                    <tr>
                        <td class="step-num"><span>2</span></td>
                        <td>Enter the six-digit code above.</td>
                    </tr>
                    <tr>
                        <td class="step-num"><span>3</span></td>
                        <td>Your account email changes once the code is confirmed.</td>
                    </tr>
                </table>

                <div class="info-box warning">
                    <span class="info-title">🔒 Security Notice</span>
                    <p class="info-content">
                        Never share this code. No one from Opol Community College will ever ask for it.
                        If you request another code, use the newest one.
                    </p>
                </div>

                <div class="info-box">
                    <span class="info-title">Didn't request this?</span>
                    <p class="info-content">You can safely ignore this email. No changes have been made to your account.</p>
                </div>
            </div>

            <div class="footer">
                &copy; {{ date('Y') }} Opol Community College. All rights reserved.<br>
                Opol, Misamis Oriental, Philippines.
            </div>
        </div>
    </div>
</body>

</html>