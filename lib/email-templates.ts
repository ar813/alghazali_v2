export const getOTPEmailTemplate = (otp: string, actionName: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Verification Code</title>
    <style>
        body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .wrapper { padding: 40px 16px; }
        .card { background: #ffffff; border-radius: 16px; max-width: 480px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%); padding: 32px 32px 24px; text-align: center; }
        .header-icon { width: 52px; height: 52px; background: rgba(255,255,255,0.15); border-radius: 14px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 26px; line-height: 52px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.3px; }
        .header p { color: rgba(255,255,255,0.75); font-size: 13px; margin: 6px 0 0; }
        .body { padding: 32px; }
        .greeting { font-size: 15px; color: #374151; margin: 0 0 8px; }
        .action-pill { display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 100px; border: 1px solid #bfdbfe; margin-bottom: 24px; }
        .otp-container { background: #f8faff; border: 2px dashed #bfdbfe; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px; }
        .otp-label { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; }
        .otp-code { font-size: 48px; font-weight: 800; letter-spacing: 12px; color: #1d4ed8; line-height: 1; font-variant-numeric: tabular-nums; }
        .otp-expiry { font-size: 12px; color: #9ca3af; margin-top: 10px; }
        .divider { height: 1px; background: #f3f4f6; margin: 24px 0; }
        .info-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; }
        .info-box p { margin: 0; font-size: 12px; color: #92400e; line-height: 1.6; }
        .info-box strong { color: #78350f; }
        .footer { padding: 20px 32px 28px; text-align: center; }
        .footer p { font-size: 11px; color: #9ca3af; margin: 0 0 4px; line-height: 1.6; }
        .footer .school { font-size: 12px; font-weight: 700; color: #6b7280; margin-bottom: 8px; }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="card">
        <div class="header">
            <div class="header-icon">🔐</div>
            <h1>Security Verification</h1>
            <p>Al-Ghazali High School Management System</p>
        </div>
        <div class="body">
            <p class="greeting">Assalam-o-Alaikum,</p>
            <p style="font-size:14px;color:#6b7280;margin:0 0 12px;">A critical action was requested:</p>
            <span class="action-pill">${actionName}</span>

            <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div class="otp-expiry">⏱ Expires in <strong>10 minutes</strong></div>
            </div>

            <div class="info-box">
                <p>⚠️ <strong>Did not receive this email?</strong> Check your <strong>Spam / Junk</strong> folder. Search for <em>"Al-Ghazali Security"</em>. Delivery may take 1–2 minutes.</p>
            </div>

            <p style="font-size:13px;color:#9ca3af;margin:0;">If you did not initiate this request, ignore this email and contact IT support immediately.</p>
        </div>
        <div class="divider" style="margin:0;"></div>
        <div class="footer">
            <p class="school">Al-Ghazali High School — Admin Portal</p>
            <p>This is an automated security message. Do not reply.</p>
        </div>
    </div>
</div>
</body>
</html>
`;
