<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - {{ config('app.name') }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f5f7fa;
            padding: 20px;
            line-height: 1.6;
        }

        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            padding: 40px 30px;
            text-align: center;
            color: white;
            position: relative;
            overflow: hidden;
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.05"/><circle cx="20" cy="80" r="0.5" fill="white" opacity="0.05"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            pointer-events: none;
        }

        .header h1 {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .header p {
            font-size: 16px;
            opacity: 0.9;
            margin: 0;
        }


        .content {
            padding: 40px 30px;
        }

        .greeting {
            font-size: 18px;
            color: #2d3748;
            margin-bottom: 24px;
            font-weight: 500;
        }

        .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 32px;
            line-height: 1.6;
        }

        .reset-section {
            text-align: center;
            margin: 32px 0;
        }

        .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            text-decoration: none;
            padding: 16px 40px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            transition: transform 0.2s ease;
        }

        .reset-button:hover {
            transform: translateY(-1px);
        }

        .info-box {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }

        .info-box.warning {
            background: #fffbeb;
            border-color: #fbbf24;
        }

        .info-box h4 {
            color: #2d3748;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .info-box p {
            color: #4a5568;
            font-size: 14px;
            margin: 0;
        }

        .info-box.warning p {
            color: #92400e;
        }

        .link-fallback {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
        }

        .link-fallback h4 {
            color: #2d3748;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .link-url {
            font-family: monospace;
            font-size: 12px;
            color: #4a5568;
            background: white;
            padding: 8px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            word-break: break-all;
        }

        .footer {
            background: #2d3748;
            color: white;
            text-align: center;
            padding: 24px 30px;
            font-size: 14px;
        }

        .footer p {
            margin: 4px 0;
            opacity: 0.8;
        }

        /* Responsive */
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }

            .email-container {
                border-radius: 8px;
            }

            .header {
                padding: 30px 20px;
            }

            .header h1 {
                font-size: 24px;
            }

            .content {
                padding: 30px 20px;
            }

            .reset-button {
                display: block;
                width: 100%;
                text-align: center;
            }
        }
    </style>
</head>

<body>
    <div class="email-container">
        <!-- Header -->
        <div class="header">
            <h1>{{ config('app.name') }}</h1>
            <p>Password Reset Request</p>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">
                Hello {{ trim($user->first_name . ' ' . ($user->middle_name ? $user->middle_name . ' ' : '') . $user->last_name) ?: 'there' }},
            </div>

            <div class="message">
                We received a request to reset your password. Click the button below to create a new password for your account.
            </div>

            <!-- Reset Button -->
            <div class="reset-section">
                <a href="{{ $resetUrl }}" class="reset-button">Reset Password</a>
            </div>

            <!-- Expiry Info -->
            <div class="info-box">
                <h4>⏰ Time Limit</h4>
                <p>This link will expire in {{ config('auth.passwords.users.expire', 60) }} minutes for security reasons.</p>
            </div>

            <!-- Security Notice -->
            <div class="info-box warning">
                <h4>🔒 Security Notice</h4>
                <p>If you didn't request this password reset, you can safely ignore this email. Your account remains secure.</p>
            </div>

            <!-- Link Fallback -->
            <div class="link-fallback">
                <h4>Button not working?</h4>
                <p style="margin-bottom: 8px; font-size: 14px; color: #4a5568;">Copy and paste this link:</p>
                <div class="link-url">{{ $resetUrl }}</div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p><strong>Opol Community College</strong></p>
            <p>Building futures, one student at a time</p>
            <p>&copy; {{ date('Y') }} Opol Community College. All rights reserved.</p>
        </div>
    </div>
</body>

</html>
