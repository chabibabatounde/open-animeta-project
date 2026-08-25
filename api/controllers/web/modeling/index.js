/**
 * Module dependencies
 */

// ...


/**
 * web/modeling/index.js
 *
 * Index modeling.
 */
module.exports = async function index(req, res) {
  let user = await User.findOne({id:1}).populate("userStatus").populate("userType");

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

  return res.view('web/modeling/index');

};
