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

        /* Institutional Blue Header */
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

        .welcome-text {
            font-size: 16px;
            color: #475569;
            margin-bottom: 25px;
        }

        /* Faculty Credentials Box */
        .credential-box {
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 25px;
            margin: 30px 0;
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

        .value:last-child {
            margin-bottom: 0;
        }

        /* Security Note */
        .security-notice {
            background-color: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 6px;
            padding: 20px;
            margin: 25px 0;
        }

        .notice-title {
            font-size: 12px;
            font-weight: bold;
            color: #92400e;
            text-transform: uppercase;
            margin-bottom: 5px;
            display: block;
        }

        .notice-text {
            font-size: 14px;
            color: #92400e;
            margin: 0;
        }

        /* Call to Action */
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

        /* Footer */
        .footer {
            text-align: center;
            padding: 30px 20px;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
        }

        /* Mobile specific */
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
                <p class="sub-header">FACULTY PORTAL</p>
            </div>

            <div class="content">
                <h3>Welcome to the Faculty, {{ $faculty['first_name'] }}!</h3>

                <p class="welcome-text">
                    Your faculty account has been successfully provisioned. You can now log in to the system to manage your classes, student grades, and academic records.
                </p>

                <div class="credential-box">
                    <div class="label">Faculty ID Number</div>
                    <span class="value">{{ $faculty['user_id_no'] }}</span>

                    <div class="label">Temporary Password</div>
                    <span class="value">{{ $password }}</span>
                </div>

                <div class="security-notice">
                    <span class="notice-title">🔐 Account Security</span>
                    <p class="notice-text">
                        To protect institutional data, please change your temporary password immediately upon your first login. Ensure your new password is secure and unique.
                    </p>
                </div>

                <div class="btn-container">
                    <a href="{{ config('app.url') . '/login' }}" class="button">Access Faculty Portal</a>
                </div>
            </div>

            <div class="footer">
                &copy; {{ date('Y') }} Opol Community College. All rights reserved.<br>
                This is an official administrative communication.
            </div>
        </div>
    </div>
</body>

</html>