export const getOTPEmailTemplate = (otp: string, actionName: string) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        .container { font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 12px; }
        .header { text-align: center; margin-bottom: 30px; }
        .otp-box { background: #f4f7ff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
        .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; }
        .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px; }
        .action-text { color: #1e40af; font-weight: bold; background: #eef2ff; padding: 2px 6px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Security Verification</h2>
        </div>
        <p>Assalamalikum,</p>
        <p>A request has been made for:</p>
        <p><strong>Action:</strong> <span class="action-text">${actionName}</span></p>
        <p>Please use the following 6-digit verification code to proceed. This code will expire in 10 minutes.</p>
        
        <div class="otp-box">
            <div style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Verification Code</div>
            <div class="otp-code">${otp}</div>
        </div>

        <p>If you did not initiate this request, please ignore this email and secure your account immediately.</p>
        
        <div class="footer">
            <p>Al-Ghazali High School Management System</p>
            <p>This is an automated security message. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
`;
