<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* Base styles */
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
            table-layout: fixed;
            background-color: #f1f5f9;
            padding: 40px 0;
        }

        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        /* Header Theme - Solid Institutional Blue */
        .header {
            background-color: #1e3a8a;
            padding: 35px 20px;
            text-align: center;
            color: #ffffff;
        }

        .school-name {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 0;
            text-transform: uppercase;
        }

        .sub-header {
            font-size: 14px;
            opacity: 0.8;
            margin-top: 5px;
            letter-spacing: 2px;
        }

        /* Content Area */
        .content {
            padding: 40px 30px;
        }

        h3 {
            color: #1e3a8a;
            margin-top: 0;
            font-size: 22px;
            margin-bottom: 20px;
        }

        .message-text {
            font-size: 16px;
            color: #475569;
            margin-bottom: 25px;
        }

        /* Info & Security Boxes */
        .info-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }

        .info-box.warning {
            background-color: #fffbeb;
            border-color: #fde68a;
        }

        .info-title {
            font-size: 12px;
            font-weight: bold;
            color: #1e3a8a;
            text-transform: uppercase;
            margin-bottom: 4px;
            display: block;
        }

        .info-box.warning .info-title {
            color: #92400e;
        }

        .info-content {
            font-size: 14px;
            color: #64748b;
            margin: 0;
        }

        .info-box.warning .info-content {
            color: #92400e;
        }

        /* Button */
        .btn-container {
            text-align: center;
            margin: 35px 0;
        }

        .button {
            display: inline-block;
            padding: 16px 40px;
            background-color: #1e3a8a;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
        }

        /* Link Fallback */
        .fallback {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #f1f5f9;
        }

        .fallback-text {
            font-size: 12px;
            color: #94a3b8;
            margin-bottom: 8px;
        }

        .url-box {
            font-family: monospace;
            font-size: 11px;
            color: #64748b;
            word-break: break-all;
            background: #f8fafc;
            padding: 10px;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 30px 20px;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
        }

        @media screen and (max-width: 600px) {
            .content {
                padding: 30px 20px;
            }

            .school-name {
                font-size: 20px;
            }

            .button {
                width: 100%;
                box-sizing: border-box;
            }
        }
    </style>
</head>

<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <p class="school-name">Opol Community College</p>
                <p class="sub-header">ACCOUNT SECURITY</p>
            </div>

            <div class="content">
                <h3>Password Reset Request</h3>

                <p class="message-text">
                    Hello {{ trim($user->first_name . ' ' . ($user->middle_name ? $user->middle_name . ' ' : '') . $user->last_name) ?: 'there' }},<br><br>
                    We received a request to reset the password for your account. Please use the button below to proceed.
                </p>

                <div class="btn-container">
                    <a href="{{ $resetUrl }}" class="button">Reset My Password</a>
                </div>

                <div class="info-box">
                    <span class="info-title">⏰ Expiration</span>
                    <p class="info-content">This reset link will expire in {{ config('auth.passwords.users.expire', 60) }} minutes.</p>
                </div>

                <div class="info-box warning">
                    <span class="info-title">🔒 Security Notice</span>
                    <p class="info-content">If you did not request this change, please disregard this email. Your password will remain unchanged.</p>
                </div>

                <div class="fallback">
                    <p class="fallback-text">If the button above doesn't work, copy and paste this URL into your browser:</p>
                    <div class="url-box">{{ $resetUrl }}</div>
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