const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    },
    tls: {
        rejectUnauthorized: false   // <-- fixes your error
    }
});

exports.sendOTP = async (to, otp) => {
    await transporter.sendMail({
        from: process.env.MAIL_USER,
        to,
        subject: "Your OTP",
        text: `Your OTP is ${otp}`
    });
};