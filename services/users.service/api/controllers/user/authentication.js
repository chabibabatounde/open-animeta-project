const jwt = require('jsonwebtoken');

module.exports = async function (req, res) {

  let apps = {
    "modeling" : 'http://modeling.com',
    "env" : 'http://env.fr',
    "contribute" : 'http://contribute.org',
  }

  
  let app = req.params.app;
  try {
    if (req.session.user) {
      return res.redirect(apps[app]); // adapte ton URL
    }

    if (req.method === 'GET') {
      return res.view('pages/login'); // views/pages/login.ejs
    }

    let { email, password } = req.body;
    // validation
    if (!email || !password) {
      error = 'Email and password are required';
    }
    // chercher user
    let user = await User.findOne({ email }).populate("userStatus").populate("userType");
    if (!user) {
      error = 'User not found';
    }
    // check activation
    if (!user.userStatus == 1) {
      error = 'Account not activated';
    }
    // check password
    let match = await sails.helpers.saltpassword(password) == user.password;

    if (!match) {
      error = 'Invalid credentials';
    }
    else{
      let token = await sails.helpers.jwtsign(
      {
        id: user.id,
        email: user.email
      }
      );

      delete user.password;
      delete user.activationToken;

      user.token = token
      req.user = user;
      req.session.user = user;

      res.cookie('jwt', token, {
        httpOnly: true,
        secure: false, // true en prod HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      return res.redirect(apps[app]); // adapte ton URL
    }

    return res.status(500).view('pages/login', {
      error: error
    });


  } catch (error) {

    sails.log.error(error);
    return res.status(500).view('pages/login', {
      error: 'Server error'
    });
  }
};