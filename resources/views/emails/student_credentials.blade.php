<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Student Account Credentials - Opol Community College</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            line-height: 1.6;
        }

        .email-wrapper {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
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

        .logo {
            width: 60px;
            height: 60px;
            background: white;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #4facfe;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
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
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 25px;
            text-align: center;
        }

        .message {
            font-size: 16px;
            color: #555;
            margin-bottom: 30px;
            line-height: 1.7;
        }

        .welcome-message {
            background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
            padding: 25px;
            border-radius: 15px;
            margin-bottom: 30px;
            border-left: 5px solid #2196f3;
            position: relative;
            overflow: hidden;
            color: #1a1a1a;
            font-weight: 500;
        }

        .credentials-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            border: 1px solid #dee2e6;
            position: relative;
            overflow: hidden;
        }

        .credentials-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
        }

        .credentials-title {
            font-size: 18px;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
        }

        .credentials-title::before {
            content: '🔐';
            margin-right: 10px;
            font-size: 20px;
        }

        .credential-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding: 15px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
        }

        .credential-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .credential-label {
            font-weight: 600;
            color: #495057;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-right: 5px;
            width: 95px;
        }

        .credential-value {
            font-size: 16px;
            font-weight: 700;
            color: #4facfe;
            font-family: 'Courier New', monospace;
            background: #f8f9fa;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #e9ecef;
        }

        .security-notice {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 1px solid #f59e0b;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            display: flex;
            align-items: flex-start;
            gap: 12px;
        }

        .security-notice::before {
            content: '⚠️';
            font-size: 20px;
            margin-right: 12px;
            flex-shrink: 0;
        }

        .security-notice p {
            margin: 0;
            color: #856404;
            font-weight: 500;
        }

        .security-icon {
            font-size: 20px;
            margin-top: 2px;
        }



        .support-section {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 25px;
            margin: 30px 0;
            text-align: center;
            border: 1px solid #e9ecef;
        }

        .support-section h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
        }

        .support-section p {
            color: #6c757d;
            margin-bottom: 20px;
        }

        .support-links {
            display: flex;
            gap: 15px;
            justify-content: space-around;
            flex-wrap: wrap;
        }

        .support-link {
            color: #4facfe;
            text-decoration: none;
            font-weight: 600;
            padding: 8px 16px;
            border: 2px solid #4facfe;
            border-radius: 25px;
            transition: all 0.3s ease;
            font-size: 14px;
        }

        .support-link:hover {
            background: #4facfe;
            color: white;
            transform: translateY(-2px);
        }

        .footer {
            background: #2c3e50;
            color: white;
            text-align: center;
            padding: 30px;
            font-size: 14px;
        }

        .footer p {
            margin: 5px 0;
            opacity: 0.8;
        }

        .social-links {
            margin-top: 20px;
        }

        .social-links a {
            color: white;
            text-decoration: none;
            margin: 0 10px;
            font-size: 18px;
            opacity: 0.7;
            transition: opacity 0.3s ease;
        }

        .social-links a:hover {
            opacity: 1;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .email-wrapper {
                background: rgba(30, 30, 30, 0.95);
                border-color: rgba(255, 255, 255, 0.1);
            }

            .content {
                color: #e0e0e0;
            }

            .greeting {
                background: linear-gradient(135deg, #64b5f6 0%, #42a5f5 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            .welcome-message {
                background: linear-gradient(135deg, #1a237e 0%, #4a148c 100%);
                color: #ffffff;
                border-left-color: #64b5f6;
                font-weight: 500;
            }

            .welcome-message strong {
                color: #ffffff;
            }

            .message {
                color: #b0b0b0;
            }

            .credentials-card {
                background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
                border-color: #4a5568;
            }

            .credentials-title {
                color: #e2e8f0;
            }

            .credential-item {
                background: #4a5568;
                color: white;
            }

            .credential-label {
                color: #cbd5e0;
            }

            .credential-value {
                background: #2d3748;
                border-color: #4a5568;
                color: #64b5f6;
            }

            .security-notice {
                background: linear-gradient(135deg, #744210 0%, #92400e 100%);
                border-color: #f59e0b;
            }

            .security-notice p {
                color: #fcd34d;
            }

            .support-section {
                background: #2d3748;
                border-color: #4a5568;
            }

            .support-section h3 {
                color: #e2e8f0;
            }

            .support-section p {
                color: #a0aec0;
            }
        }

        /* Responsive Design */
        @media only screen and (max-width: 600px) {
            body {
                padding: 10px;
            }

            .email-wrapper {
                border-radius: 15px;
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

            .credentials-card {
                padding: 20px;
            }

            .credential-item {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
            }

            .support-links {
                flex-direction: column;
                align-items: center;
            }
        }

        .cta-button {
            display: block;
            width: fit-content;
            margin: 30px auto;
            padding: 16px 32px;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(79, 70, 229, 0.4);
            position: relative;
            overflow: hidden;
        }

        .cta-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }

        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(79, 70, 229, 0.4);
        }

        .cta-button:hover::before {
            left: 100%;
        }
    </style>
</head>

<body>
    <div class="email-wrapper">
        <!-- Header Section -->
        <div class="header">
            <h1>Welcome to OCC!</h1>
            <p>Your gateway to academic excellence</p>
        </div>

        <!-- Main Content -->
        <div class="content">
            <div class="greeting">
                Hello {{ $student['first_name'] }} {{ $student['middle_name'] }} {{ $student['last_name'] }}! 👋
            </div>

            <div class="welcome-message">
                Congratulations! Your student account has been successfully created at <strong>Opol Community College</strong>.
                You're now ready to access our enrollment system and begin your academic journey with us.
            </div>

            <!-- Credentials Card -->
            <div class="credentials-card">
                <div class="credentials-title">Your Login Credentials</div>

                <div class="credential-item">
                    <span class="credential-label">Student ID</span>
                    <span class="credential-value">{{ $student['user_id_no'] }}</span>
                </div>

                <div class="credential-item">
                    <span class="credential-label">Password</span>
                    <span class="credential-value">{{ $password }}</span>
                </div>
            </div>

            <!-- Security Notice -->
            <div class="security-notice">
                <div class="security-icon">🔐</div>
                <div>
                    <p><strong>Important Security Notice:</strong> Please change your password immediately after your first login to ensure your account security. Use a strong password with a mix of letters, numbers, and special characters.</p>
                </div>
            </div>

            <!-- Call to Action -->
            <a href="{{ config('app.url') . '/login' }}" class="cta-button">
                🚀 Access Your Account Now
            </a>

            <!-- Support Section -->
            <!-- <div class="support-section">
                <h3>Need Help?</h3>
                <p>Our support team is here to assist you with any questions or technical issues.</p>
                <div class="support-links">
                    <a href="occ@occ.edu.ph" class="support-link">📧 Email Support</a>
                    <a href="tel:+1234567890" class="support-link">📞 Call Us</a>
                </div>
            </div> -->
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
