module.exports = async function (req, res) {
  let error = '';
  let token = req.params.token;

  try {

    let user = await User.findOne({ resetToken: token });

    if (!user || user.resetTokenExpiry < Date.now()) {
      return res.json({
        error: 'Invalid or expired token'
      });
    }


    // ✅ GET → afficher form
    if (req.method === 'GET') {
      return res.view('pages/newpass',{error, token});
    }

    let { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      error = 'All fields are required';
      return res.view('pages/newpass', { error, token });
    }

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return res.view('pages/newpass', { error, token });
    }


    // ✅ update password
    await User.updateOne({ id: user.id }).set({
      password: await sails.helpers.saltpassword(password),
      resetToken: '',
    });

    return res.redirect('/auth/modeling');

  } catch (e) {
    console.log(e)
    return res.view('pages/newpass', {
      error: 'Server error',
      token
    });
  }
};