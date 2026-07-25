const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || "TheHub <onboarding@resend.dev>";

async function sendPasswordResetEmail(to, resetLink) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Reset your TheHub password",
    html: `
      <p>Someone requested a password reset for your TheHub account.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
