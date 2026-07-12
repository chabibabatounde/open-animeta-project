const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async function (req, res) {

  let response = {
    info: 'An error occurred',
    data: {}
  };
  let responseStatus = 500;
  try {
    let { email, password } = req.body;
    // validation
    if (!email || !password) {
      response.info = 'Email and password are required';
      responseStatus = 400;
      return res.status(responseStatus).json(response);
    }
    // chercher user
    let user = await User.findOne({ email }).populate("userStatus").populate("userType");
    if (!user) {
      response.info = 'User not found';
      responseStatus = 404;
      return res.status(responseStatus).json(response);
    }
    // check activation
    if (!user.userStatus == 1) {
      response.info = 'Account not activated';
      responseStatus = 403;
      return res.status(responseStatus).json(response);
    }

    // check password
    let match = await sails.helpers.saltpassword(password) == user.password;
    console.log(await sails.helpers.saltpassword(password))

    if (!match) {
      response.info = 'Invalid credentials';
      responseStatus = 401;
      return res.status(responseStatus).json(response);
    }

    // ✅ génération JWT
    let token = await sails.helpers.jwtsign(
      {
        id: user.id,
        email: user.email
      }
    );

    // ✅ remove password
    delete user.password;
    delete user.activationToken;

    response.info = 'Login successful';
    response.data = {
      user,
      token
    };
    responseStatus = 200;

    return res.status(responseStatus).json(response);

  } catch (err) {
    return res.serverError(err);
  }
};