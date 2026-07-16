const crypto = require('crypto');

module.exports = async function (req, res) {
  let error = '';

  try {
    // ✅ GET → afficher formulaire
    if (req.method === 'GET') {
      return res.view('pages/resetpass');
    }

    let { email } = req.body;

    if (!email) {
      error = 'Email is required';
      return res.view('pages/resetpass', { error });
    }

    let user = await User.findOne({ email });

    // ✅ toujours répondre OK (sécurité)
    if (!user) {
      return res.view('pages/emailsent', { email });
    }

    // ✅ token
    let resetToken = crypto.randomBytes(32).toString('hex');

    await User.updateOne({ id: user.id }).set({
      resetToken,
      resetTokenExpiry: Date.now() + 1000 * 60 * 30 // 30 min
    });

    let resetLink = await sails.helpers.baseurl() + `/password/reset/${resetToken}`;

    let html = `
      <h2>Password Reset</h2>
      <p>Click below to reset your password:</p>
      <a href="${resetLink}">Reset my password</a>
      <p>This link expires in 30 minutes.</p>
    `;

    await sails.helpers.sendmail(email, 'Password reset', html);

    return res.view('pages/emailsent', { email });

  } catch (e) {
    return res.json( { error: 'Server error' });
  }
};