import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Website <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.log("Resend Error:", error);
    } else {
      console.log("Email sent:", data);
    }
  } catch (err) {
    console.error("Catch Error:", err);
  }
};
