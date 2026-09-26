import { markdownToEmailHtml, MarkdownOptions } from './email-markdown';

export interface EmailTemplateConfig {
  id: string;
  name: string;
  category: 'announcement' | 'admission' | 'fee' | 'exam' | 'urgent' | 'meeting' | 'custom';
  description: string;
  defaultSubject: string;
  defaultPreheader: string;
  themeColor: string; // e.g. '#0d9488' (teal), '#2563eb' (blue), '#e11d48' (rose), '#7c3aed' (purple)
  headerBadge: string;
  markdownContent: string;
}

export const PRESET_EMAIL_TEMPLATES: EmailTemplateConfig[] = [
  {
    id: 'announcement',
    name: 'Official Announcement / Circular',
    category: 'announcement',
    description: 'Standard formal notification for school-wide notices, events, and policy updates.',
    defaultSubject: '📢 Circular: Important Update Regarding Academic Calendar 2026',
    defaultPreheader: 'Please read this official notice from Al-Ghazali High School administration.',
    themeColor: '#0d9488', // Emerald / Teal
    headerBadge: 'OFFICIAL CIRCULAR',
    markdownContent: `# Important Academic Announcement 📢

Dear Parents, Guardians, and Students,

Assalamu Alaikum wa Rahmatullahi wa Barakatuh,

We hope this message reaches you in the highest states of health and Iman.

This is an official communication regarding our upcoming academic activities and revised schedule for the ongoing term:

### Key Highlights & Schedule:
* **Academic Review Week**: Starting next Monday, students will engage in revision assessments.
* **Special Co-Curricular Workshops**: Hands-on Science & Robotic sessions will be organized for Grades 6 through 10.
* **Daily Timings**: Morning assembly starts promptly at **7:45 AM**. Late entries will not be permitted.

:::callout-info
**Important Attendance Guideline:**  
Consistent attendance is vital for semester progression. In case of illness or unforeseen absence, kindly submit a written application to the section head.
:::

:::button url="https://alghazali.edu.pk/academic-calendar" text="View Complete Academic Calendar" :::

Thank you for your continued cooperation and dedication to excellence in education.

Warm regards,  
**Office of the Principal**  
Al-Ghazali High School & College  
Karachi, Pakistan
`,
  },
  {
    id: 'admissions',
    name: 'Admissions Welcome & Orientation',
    category: 'admission',
    description: 'Welcome package and orientation instructions for newly admitted students and parents.',
    defaultSubject: '🎓 Welcome to Al-Ghazali High School - Admission Confirmation & Orientation',
    defaultPreheader: 'Congratulations on your admission! Here are the next steps for student orientation.',
    themeColor: '#2563eb', // Blue
    headerBadge: 'ADMISSION CONFIRMATION',
    markdownContent: `# Congratulations & Welcome to Al-Ghazali! 🎓

Dear Parents and Student,

Assalamu Alaikum,

On behalf of the Management, Faculty, and Staff of **Al-Ghazali High School**, we are delighted to congratulate you on securing admission for the upcoming academic session **2026–2027**.

We take immense pride in fostering an environment where Islamic values harmoniously integrate with cutting-edge academic excellence.

### Next Steps for Enrollment:
1. **Document Verification**: Kindly visit the admissions office between **9:00 AM – 1:00 PM** with original birth certificates and transfer credentials.
2. **Student Portal Activation**: Access your dedicated student portal using the credentials provided below.
3. **Uniform & Books**: The school bookshop and uniform depot will remain open from Saturday.

| Item | Location | Timings |
|---|---|---|
| Document Desk | Admin Block, Room 102 | 9:00 AM - 1:00 PM |
| Book Depot | Basement Wing A | 10:00 AM - 3:00 PM |
| IT Helpdesk | 2nd Floor, Computer Lab 1 | 9:00 AM - 2:00 PM |

:::callout-success
**Orientation Day:**  
The Student & Parent Orientation session is scheduled for **Saturday at 10:00 AM** in the Main Auditorium.
:::

:::button url="https://alghazali.edu.pk/portal" text="Access Student Portal" :::

We eagerly look forward to partnering with you in your child’s educational journey.

Sincerely,  
**Director of Admissions**  
Al-Ghazali High School
`,
  },
  {
    id: 'fee-reminder',
    name: 'Tuition Fee Reminder & Notice',
    category: 'fee',
    description: 'Gentle reminder regarding tuition fee due dates, online payment methods, and bank slips.',
    defaultSubject: '💳 Tuition Fee Notice for the Month of October 2026',
    defaultPreheader: 'Notice regarding payment of tuition dues before the upcoming deadline.',
    themeColor: '#d97706', // Amber
    headerBadge: 'ACCOUNTS & FINANCE',
    markdownContent: `# Tuition Fee Reminder Notice 💳

Dear Respected Parents & Guardians,

Assalamu Alaikum,

This is a courtesy reminder regarding the **Tuition and Transport Fee** for the current billing cycle.

Timely settlement of fees enables the school to maintain top-tier educational facilities, faculty development, and extracurricular operations without interruption.

### Due Date Details:
* **Billing Period**: Current Academic Month
* **Last Date for Submission (Without Surcharge)**: **10th of this month**
* **Grace Period**: Up to 15th (Standard late fee applies thereafter)

:::callout-warning
**Online Payment Available:**  
You can pay directly via 1Link, KuickPay, Bank Transfer, or Debit/Credit Card through our secure parent portal.
:::

### Bank Deposit Information:
* **Bank Name**: Meezan Bank Limited
* **Account Title**: Al-Ghazali Educational Trust
* **Account / IBAN**: PK78MEZN0001234567890123
* **Branch**: Gulshan-e-Iqbal Branch, Karachi

:::button url="https://alghazali.edu.pk/fee-challan" text="Download Fee Challan & Pay Online" :::

If you have already settled the dues within the last 24 hours, please disregard this reminder and accept our gratitude.

Warm regards,  
**Accounts Department**  
Al-Ghazali High School
`,
  },
  {
    id: 'exam-results',
    name: 'Exam Schedule & Result Notification',
    category: 'exam',
    description: 'Examination datesheet release, grading guidelines, and online report card distribution.',
    defaultSubject: '📊 Announcement: Examination Datesheet & Term Results Portal',
    defaultPreheader: 'Access student examination schedule and academic progress reports.',
    themeColor: '#7c3aed', // Violet
    headerBadge: 'EXAMINATION CONTROLLER',
    markdownContent: `# Mid-Term Examination Notification 📊

Dear Parents and Students,

Assalamu Alaikum,

The Examination Committee wishes to announce the official schedule and protocols for the upcoming **Mid-Term Examinations 2026**.

The detailed syllabus breakdown and date sheets have been uploaded to the school management system.

### Examination Instructions:
1. Students must arrive **at least 20 minutes** prior to the examination start time.
2. Possession of mobile phones, smartwatches, or unauthorized study material in the examination hall will lead to immediate cancellation of paper.
3. Admit cards must be displayed on student desks during all exams.

| Class / Section | Exam Timing | Reporting Time |
|---|---|---|
| Primary (Grades 1–5) | 8:30 AM – 11:00 AM | 8:00 AM |
| Middle & Senior (Grades 6–10) | 8:30 AM – 11:45 AM | 8:00 AM |

:::callout-info
**Special Revision Sessions:**  
Subject teachers will conduct revision doubt-clearing sessions daily between 12:00 PM and 1:30 PM.
:::

:::button url="https://alghazali.edu.pk/results" text="Download Datesheet & Syllabus" :::

We pray for our students’ success, confidence, and steadfast commitment in their exams.

Best of luck,  
**Controller of Examinations**  
Al-Ghazali High School
`,
  },
  {
    id: 'urgent-closure',
    name: 'Urgent Weather / Emergency Advisory',
    category: 'urgent',
    description: 'High-priority advisory for sudden school closures, severe weather, or government directives.',
    defaultSubject: '🚨 URGENT: School Closure Notice & Weather Advisory',
    defaultPreheader: 'Immediate notice regarding school closure and transition to online learning.',
    themeColor: '#e11d48', // Rose / Red
    headerBadge: 'URGENT NOTIFICATION',
    markdownContent: `# Urgent Notification: School Closure & Online Classes 🚨

Dear Parents, Teachers, and Students,

Assalamu Alaikum,

In accordance with official government directives and current advisory issued by the Meteorological Department regarding **severe rainfall / public conditions**, please take note of the following emergency decisions:

### Key Directives:
* **School Campus Status**: The school campus will remain **CLOSED** on tomorrow.
* **Online Classes**: Synchronous academic sessions will take place via **Google Classroom / Zoom** starting at 9:00 AM.
* **Homework & Assignments**: Daily diaries and worksheets will be posted on the portal by 8:30 AM.

:::callout-warning
**Safety First:**  
All students and staff are strongly urged to stay indoors and avoid unnecessary transit. The school administration is monitoring the situation continuously.
:::

For urgent administrative assistance, the helpline number remains operational:  
📞 **Helpline**: +92-21-34567890 | 📱 **WhatsApp**: +92-300-1234567

:::button url="https://alghazali.edu.pk/online-classes" text="Join Online Virtual Classrooms" :::

Stay safe and keep our community in your prayers.

Management,  
**Crisis Response Committee**  
Al-Ghazali High School
`,
  },
  {
    id: 'ptm',
    name: 'Parent-Teacher Meeting (PTM) Invitation',
    category: 'meeting',
    description: 'Formal invitation to parents for discussing student progress, behavior, and term achievements.',
    defaultSubject: '🤝 Invitation: Parent-Teacher Conference (PTM) 2026',
    defaultPreheader: 'You are cordially invited to attend our Term Parent-Teacher Meeting.',
    themeColor: '#059669', // Emerald
    headerBadge: 'PARENT-TEACHER CONFERENCE',
    markdownContent: `# Invitation to Parent-Teacher Meeting (PTM) 🤝

Respected Parents & Guardians,

Assalamu Alaikum wa Rahmatullahi wa Barakatuh,

Education is a sacred partnership between parents and educators. We cordially invite you to attend the **Term Parent-Teacher Conference (PTM)** to review your child’s academic progress, behavioral growth, and personal development.

### Conference Details:
* **Date**: Upcoming Saturday
* **Timings**: 9:00 AM to 1:30 PM
* **Venue**: Respective Section Classrooms & Main Campus Hall

### Meeting Agenda:
* Evaluation of student performance in recent tests and quizzes.
* Review of class participation, attendance records, and notebook maintenance.
* Tailored guidance for students requiring remedial reinforcement.
* Discussion on upcoming sports and annual function preparations.

:::callout-info
**Slot Reservation:**  
To prevent long waiting times, please book your preferred 15-minute time slot with your child’s class teacher via the link below.
:::

:::button url="https://alghazali.edu.pk/ptm-booking" text="Reserve Your PTM Time Slot" :::

Your presence is invaluable in guiding our students toward the peak of their potential.

Looking forward to meeting you.

Warmest regards,  
**Faculty & Academic Coordinators**  
Al-Ghazali High School
`,
  },
  {
    id: 'custom',
    name: 'Blank Slate / Custom Template',
    category: 'custom',
    description: 'A clean canvas with standard school headers and footers for custom messaging.',
    defaultSubject: 'Notification from Al-Ghazali High School',
    defaultPreheader: 'Message from Al-Ghazali High School administration.',
    themeColor: '#0d9488',
    headerBadge: 'ADMINISTRATION',
    markdownContent: `# Official Communication

Dear Recipient,

Assalamu Alaikum,

Write your custom message here using **bold**, *italics*, lists, or tables.

### Key Points:
* First important point
* Second important point
* Third important point

> Feel free to use quote blocks to highlight critical details.

:::callout-info
You can also use styled callout boxes for information or alerts.
:::

:::button url="https://alghazali.edu.pk" text="Visit School Portal" :::

Warm regards,  
**Al-Ghazali High School Administration**
`,
  },
];

export interface FullEmailOptions {
  title: string;
  preheader?: string;
  markdownContent: string;
  headerBadge?: string;
  themeColor?: string;
  schoolName?: string;
  schoolTagline?: string;
}

/**
 * Wraps converted markdown HTML inside a responsive, modern email framework.
 * Compatible with Gmail, Outlook, Apple Mail, and mobile clients.
 */
export function generateFullEmailHtml(options: FullEmailOptions): string {
  const {
    title,
    preheader = 'Official notification from Al-Ghazali High School',
    markdownContent,
    headerBadge = 'OFFICIAL COMMUNICATION',
    themeColor = '#0d9488',
    schoolName = 'AL-GHAZALI HIGH SCHOOL',
    schoolTagline = 'Excellence in Islamic & Modern Education',
  } = options;

  const contentHtml = markdownToEmailHtml(markdownContent, { themeColor });

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeXml(title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; }
    @media screen and (max-width: 620px) {
      .email-container { width: 100% !important; margin: 0 auto !important; border-radius: 8px !important; }
      .fluid-padding { padding-left: 18px !important; padding-right: 18px !important; }
      .header-title { font-size: 18px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">

  <!-- Hidden Preheader Text for Inbox snippet -->
  <div style="display: none; font-size: 1px; color: #f1f5f9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${escapeXml(preheader)} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; min-height: 100%;">
    <tr>
      <td align="center" style="padding: 24px 8px;">

        <!-- Main Email Container (Max 600px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">

          <!-- Top Brand Accent Bar -->
          <tr>
            <td style="background-color: ${themeColor}; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Section with Real School Logo -->
          <tr>
            <td class="fluid-padding" style="padding: 30px 36px 22px 36px; border-bottom: 1px solid #f1f5f9; text-align: left;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td valign="middle" align="left">
                    <!-- Badge -->
                    <div style="display: inline-block; padding: 4px 12px; background-color: #f8fafc; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; color: ${themeColor}; margin-bottom: 10px; border: 1px solid #e2e8f0;">
                      ${escapeXml(headerBadge)}
                    </div>
                    <!-- School Name -->
                    <div class="header-title" style="font-size: 21px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; margin: 0 0 4px 0; line-height: 1.25;">
                      ${escapeXml(schoolName)}
                    </div>
                    <!-- Tagline -->
                    <div style="font-size: 13px; color: #64748b; font-weight: 500;">
                      ${escapeXml(schoolTagline)}
                    </div>
                  </td>
                  <td align="right" valign="middle" style="width: 64px; padding-left: 12px;">
                    <div style="width: 58px; height: 58px; border-radius: 12px; background-color: #ffffff; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); padding: 4px;">
                      <img src="https://alghazali.vercel.app/logo.png" alt="Al-Ghazali High School" width="50" height="50" style="width: 50px; height: 50px; object-fit: contain; display: block; border: 0;" />
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td class="fluid-padding" style="padding: 32px 36px; font-size: 15px; line-height: 1.68; color: #334155; text-align: left;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Pre-Footer Support Box -->
          <tr>
            <td class="fluid-padding" style="padding: 0 36px 28px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px;">
                <tr>
                  <td style="font-size: 13px; color: #64748b; line-height: 1.5;">
                    <strong style="color: #0f172a;">Official Assistance:</strong> If you have any questions or require verification regarding this official communication, please reach out via our online portal or front desk helpline.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td class="fluid-padding" style="padding: 24px 36px 30px 36px; background-color: #0f172a; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.6;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                      <tr>
                        <td valign="middle" style="padding-right: 10px;">
                          <img src="https://alghazali.vercel.app/logo.png" alt="Logo" width="28" height="28" style="width: 28px; height: 28px; object-fit: contain; display: block; border: 0;" />
                        </td>
                        <td valign="middle">
                          <span style="color: #ffffff; font-weight: 800; font-size: 14px; letter-spacing: 0.05em;">AL-GHAZALI HIGH SCHOOL</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 12px; color: #94a3b8; font-size: 12px;">
                    📍 Karachi, Sindh, Pakistan &nbsp;|&nbsp; 🌐 <a href="https://alghazali.vercel.app" target="_blank" style="color: #38bdf8; text-decoration: none; font-weight: 600;">alghazali.vercel.app</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="border-top: 1px solid #1e293b; padding-top: 14px; font-size: 11px; color: #64748b; line-height: 1.5;">
                    This is an automated system notification dispatched via the Super Admin Command Portal.<br />
                    &copy; ${new Date().getFullYear()} Al-Ghazali High School. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- End Main Email Container -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function getOTPEmailTemplate(otp: string, actionName: string = "Verification"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(actionName)} OTP Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; margin: 0; text-transform: uppercase;">AL-GHAZALI HIGH SCHOOL</h1>
              <p style="color: #94a3b8; font-size: 12px; margin: 6px 0 0 0; text-transform: uppercase; letter-spacing: 0.1em;">Security Authorization Service</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px; text-align: center;">
              <div style="display: inline-block; padding: 6px 14px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 20px; color: #166534; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 20px;">
                ${escapeXml(actionName)}
              </div>
              <h2 style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">One-Time Verification Code</h2>
              <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 28px 0;">
                Use the following 4-digit code to authorize your request. This security code will expire in <strong>10 minutes</strong>.
              </p>
              <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; margin: 0 auto 28px auto; max-width: 260px;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #0f172a; margin-left: 12px;">${escapeXml(otp)}</span>
              </div>
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin: 0;">
                If you did not initiate this action, please ignore this email or contact the system administrator immediately.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 11px;">
              &copy; ${new Date().getFullYear()} Al-Ghazali High School. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

