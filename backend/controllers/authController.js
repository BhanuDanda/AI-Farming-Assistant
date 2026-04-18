const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');

// Create test account for sending emails with Ethereal
let transporter;
nodemailer.createTestAccount().then(account => {
  transporter = nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: {
      user: account.user,
      pass: account.pass
    }
  });
});

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-krishiai-key';

const loginUser = async (req, res) => {
  const { email, name, role, state } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const token = jwt.sign({ email, name: name || 'Farmer', role: role || 'farmer', state: state || '' }, JWT_SECRET, { expiresIn: '15m' });
  const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/verify?token=${token}`;

  try {
    const info = await transporter.sendMail({
      from: '"KrishiAI Support" <support@krishiai.com>',
      to: email,
      subject: 'Verify your KrishiAI Login',
      html: `
        <h3>Login Verification</h3>
        <p>Hello ${name || 'Farmer'},</p>
        <p>Please click the link below to verify your email and securely log in to KrishiAI:</p>
        <a href="${verificationLink}" style="padding: 10px 20px; background-color: #2d6a4f; color: white; text-decoration: none; border-radius: 5px;">Verify & Login</a>
        <p>If you did not request this, please ignore this email.</p>
      `
    });

    res.json({ 
      success: true, 
      message: 'Verification email sent. Check your inbox.',
      previewUrl: nodemailer.getTestMessageUrl(info) // For easy access during development
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
};

const verifyToken = (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('No token provided');

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).send('Invalid or expired token.');

    // We pass the decoded user info back to the frontend to store and log in
    res.send(`
      <html>
        <body>
          <h2>Verification Successful!</h2>
          <p>Redirecting to dashboard...</p>
          <script>
            localStorage.setItem('krishiai_user', JSON.stringify({
              email: "${decoded.email}",
              name: "${decoded.name}",
              role: "${decoded.role}",
              state: "${decoded.state}",
              loginMethod: "email"
            }));
            window.location.href = '/index.html';
          </script>
        </body>
      </html>
    `);
  });
};

module.exports = { loginUser, verifyToken };
