<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
            width: 90%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

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
            color: #ffffff;
        }

        .content {
            padding: 40px 30px;
            background-color: #ffffff;
        }

        h3 {
            color: #1e3a8a;
            margin-top: 0;
            font-size: 22px;
            margin-bottom: 20px;
        }

        .welcome-text {
            font-size: 16px;
            color: #475569;
            margin-bottom: 25px;
        }

        .credential-box {
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 25px;
            margin: 30px 0;
            text-align: left;
        }

        .label {
            font-size: 11px;
            font-weight: bold;
            color: #2563eb;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 6px;
        }

        .value {
            font-family: 'Courier New', Courier, monospace;
            font-size: 20px;
            color: #1e293b;
            font-weight: bold;
            word-break: break-all;
            margin-bottom: 20px;
            display: block;
        }

        .notice {
            font-size: 14px;
            color: #64748b;
            border-left: 3px solid #cbd5e1;
            padding-left: 15px;
            margin: 25px 0;
        }

        .btn-container {
            text-align: center;
            margin-top: 35px;
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

        .footer {
            text-align: center;
            padding: 30px 20px;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
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
                <h3>Credentials Updated</h3>

                <p class="welcome-text">
                    Hello {{ $student['first_name'] }},<br><br>
                    Your account credentials have been reset by an administrator. Please use the temporary password below to access your account.
                </p>

                <div class="credential-box">
                    <div class="label">ID Number</div>
                    <span class="value">{{ $student['user_id_no'] }}</span>

                    <div class="label">Password</div>
                    <span class="value">{{ $password }}</span>
                </div>

                <div class="notice">
                    <strong>Note:</strong> You will be required to change this temporary password upon your next successful login.
                </div>

                <div class="btn-container">
                    <a href="{{ config('app.url') . '/login' }}" class="button">Access Student Portal</a>
                </div>
            </div>

            <div class="footer">
                &copy; {{ date('Y') }} Opol Community College. All rights reserved.<br>
                This is an automated administrative notification.
            </div>
        </div>
    </div>
</body>

</html>