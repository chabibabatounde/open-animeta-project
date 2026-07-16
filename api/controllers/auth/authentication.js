const jwt = require('jsonwebtoken');

module.exports = async function (req, res) {


  let app = req.params.app;
  try {
    let error = ''
    if (req.session.user) {
      return res.redirect(await sails.helpers.baseurl()+'/'+app); // adapte ton URL
    }

    if (req.method === 'GET') {
      return res.view('web/auth/login'); // views/pages/login.ejs
    }

    let { email, password } = req.body;
    // validation
    if (!email || !password) {
      error = 'Email and password are required';
    }
    // chercher user
    let user = await User.findOne({email:email }).populate("userStatus").populate("userType");
    if (!user) {
      error = 'User not found';
    }else{
      // check password
      let match = await sails.helpers.saltpassword(password) == user.password;
      if (!match) {
        error = 'Invalid credentials';
      }
      // check activation
      if (!user.userStatus.id == 1) {
        error = 'Account not activated';
      }


      if(error == ''){
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
        return res.redirect(await sails.helpers.baseurl()+'/'+app); // adapte ton URL
      }

    }
    return res.view('web/auth/login', {
      error: error
    });

    
    
    
    /*
    else{

      console.log(error)

      

      return res.view('web/auth/login', {
        error: error
      });
    }
    */
  } catch (error) {
    sails.log.error(error);
    return res.status(500).view('web/auth/login', {
      error: 'Server error'
    });
  }
};