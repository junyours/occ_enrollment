<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Your account email was changed</title>
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

        /* Details card */
        .detail-card {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-left: 4px solid #16a34a;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }

        .detail-label {
            display: block;
            font-size: 12px;
            font-weight: bold;
            color: #166534;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 2px;
        }

        .detail-value {
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
            margin: 0 0 16px;
            word-break: break-all;
        }

        .detail-value:last-child {
            margin-bottom: 0;
        }

        /* Alert */
        .info-box.danger {
            background-color: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 8px;
            padding: 20px;
            margin: 0;
        }

        .info-title {
            display: block;
            font-size: 14px;
            font-weight: bold;
            color: #991b1b;
            margin-bottom: 8px;
        }

        .info-content {
            font-size: 14px;
            color: #991b1b;
            margin: 0 0 6px;
        }

        .info-content:last-child {
            margin-bottom: 0;
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
        }
    </style>
</head>

<body>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
        Your account email is now {{ $newEmail }}. If this wasn't you, act immediately.
    </div>

    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="icon">✅</div>
                <p class="school-name">Opol Community College</p>
                <p class="sub-header">ACCOUNT SECURITY</p>
            </div>

            <div class="content">
                <h1>Your account email was changed</h1>

                <p class="lead">
                    The email address for your Opol Community College SIS account was updated after verification.
                </p>

                <div class="detail-card">
                    <span class="detail-label">New email</span>
                    <p class="detail-value">{{ $newEmail }}</p>

                    <span class="detail-label">Changed on</span>
                    <p class="detail-value">{{ now()->format('M j, Y, g:i A T') }}</p>
                </div>

                <div class="info-box danger">
                    <span class="info-title">⚠️ Wasn't you?</span>
                    <p class="info-content">1. Contact your administrator immediately.</p>
                    <p class="info-content">2. Change your password right away.</p>
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