import nodemailer from 'nodemailer';

// Create email transporter
// For production, configure with actual SMTP credentials
// For development, you can use ethereal.email or mailtrap.io
export async function createEmailTransporter() {
  // Check if SMTP credentials are provided in environment variables
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to Ethereal for development
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  recipientName: string
) {
  try {
    const transporter = await createEmailTransporter();

    // Build reset URL based on environment
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.SMTP_FROM || '"System Obecności CSM" <noreply@csm-system.pl>',
      to,
      subject: 'Reset hasła - System Obecności CSM',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background-color: #4F46E5;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
              }
              .content {
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 5px 5px;
              }
              .button {
                display: inline-block;
                padding: 12px 24px;
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
              }
              .warning {
                background-color: #FEF3C7;
                border-left: 4px solid #F59E0B;
                padding: 12px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Reset hasła</h1>
            </div>
            <div class="content">
              <p>Cześć ${recipientName},</p>
              <p>Otrzymaliśmy prośbę o reset hasła do Twojego konta w Systemie Obecności CSM.</p>
              <p>Aby zresetować hasło, kliknij w poniższy przycisk:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Zresetuj hasło</a>
              </p>
              <p>Lub skopiuj i wklej poniższy link do przeglądarki:</p>
              <p style="word-break: break-all; background-color: #e5e7eb; padding: 10px; border-radius: 5px;">
                ${resetUrl}
              </p>
              <div class="warning">
                <strong>⚠️ Ważne:</strong> Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.
              </div>
              <p>Pozdrawiamy,<br>Zespół CSM</p>
            </div>
            <div class="footer">
              <p>To jest automatyczna wiadomość, prosimy nie odpowiadać na ten email.</p>
            </div>
          </body>
        </html>
      `,
      text: `
        Cześć ${recipientName},

        Otrzymaliśmy prośbę o reset hasła do Twojego konta w Systemie Obecności CSM.

        Aby zresetować hasło, otwórz poniższy link w przeglądarce:
        ${resetUrl}

        Link jest ważny przez 1 godzinę. Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.

        Pozdrawiamy,
        Zespół CSM
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    // Log preview URL for development (Ethereal)
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
      console.log('📧 Password reset email sent!');
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
