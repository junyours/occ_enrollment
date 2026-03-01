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
            padding-bottom: 40px;
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

        /* Header Theme */
        .header {
            background-color: #1e3a8a;
            padding: 30px 20px;
            text-align: center;
            color: #ffffff;
        }

        .school-name {
            font-size: 22px;
            font-weight: bold;
            letter-spacing: 1px;
            margin: 0;
        }

        .sub-header {
            font-size: 14px;
            opacity: 0.9;
            margin-top: 5px;
            text-transform: uppercase;
        }

        /* Content Area */
        .content {
            padding: 30px 25px;
        }

        h3 {
            color: #1e3a8a;
            margin-top: 0;
            font-size: 20px;
        }

        /* Credential Box */
        .credential-box {
            background-color: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            padding: 20px;
            margin: 25px 0;
        }

        .label {
            font-size: 11px;
            font-weight: bold;
            color: #3b82f6;
            text-transform: uppercase;
            margin-bottom: 4px;
        }

        .value {
            font-family: 'Courier New', Courier, monospace;
            font-size: 18px;
            color: #1e293b;
            font-weight: bold;
            word-break: break-all;
            margin-bottom: 15px;
            display: block;
        }

        .value:last-child {
            margin-bottom: 0;
        }

        /* Call to Action */
        .btn-container {
            text-align: center;
            margin-top: 30px;
        }

        .button {
            display: inline-block;
            padding: 14px 30px;
            background-color: #2563eb;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #64748b;
        }

        /* Mobile specific */
        @media screen and (max-width: 600px) {
            .content {
                padding: 20px 15px;
            }

            .school-name {
                font-size: 18px;
            }
        }
    </style>
</head>

<body>
    <div class="wrapper">
        <div class="container" style="margin-top: 20px;">
            <div class="header">
                <p class="school-name">Opol Community College</p>
                <p class="sub-header">STUDENT INFORMATION SYSTEM</p>
            </div>

            <div class="content">
                <h3>Hello, {{ $info['first_name'] }} {{ $info['middle_name'] ?? '' }} {{ $info['last_name'] }}!</h3>
                <p>An official evaluator account has been created for you. You may now access the portal to manage student assessments.</p>

                <div class="credential-box">
                    <div class="label">ID Number</div>
                    <span class="value">{{ $userIdNo }}</span>

                    <div class="label">Password</div>
                    <span class="value">{{ $password }}</span>
                </div>

                <p>To maintain account security, please log in and change your password immediately.</p>

                <div class="btn-container">
                    <a href="{{ url('/login') }}" class="button">Access My Account</a>
                </div>
            </div>

            <div class="footer">
                &copy; 2024 Opol Community College. All rights reserved.<br>
                This is an automated message, please do not reply.
            </div>
        </div>
    </div>
</body>

</html>