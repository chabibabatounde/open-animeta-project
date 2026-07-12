/**
 * Module dependencies
 */

// ...
const crypto = require('crypto');

/**
 * user/create.js
 *
 * Create user.
 */
module.exports = async function (req, res) {

  let response = {
    info: 'An error occured',
    data: {}
  };
  let responseStatus = 500;

  try {

    let post = req.body;
    // 1. Validation basique
    if (!post.email || !post.password) {
      response.info = 'Email and password are required';
      responseStatus = 400;
      res.status(responseStatus);
      return res.json(response);
    }
    // 2. Vérifier si user existe
    let user = await User.find({
      email: post.email
    }).populate('userType').populate('userStatus');

    if (user && user.length === 1) {
      response.info = 'User already exists: ' + post.email;
      responseStatus = 200;
    } else {
      // Génération token
      let activationToken = crypto.randomBytes(32).toString('hex');

      // Création user
      let newUser = await User.create({
        email: post.email,
        password: await sails.helpers.saltpassword(post.password),
        userType: 1,
        userStatus: 1,
        activationToken: activationToken,
      }).fetch();

      delete newUser.password;

      // Lien activation
      let activationLink = await sails.helpers.baseurl()+'/user/activate/${activationToken}';

      let html = `
      <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:40px;">
        <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; padding:30px; text-align:center; box-shadow:0 5px 15px rgba(0,0,0,0.05);">
          
          <h2 style="color:#333;">Welcome to ANIMETA</h2>
          
          <p style="color:#555; font-size:16px;">
            We're excited to have you on board!
          </p>
          
          <p style="color:#555; font-size:16px;">
            Please confirm your email address to activate your account.
          </p>

          <a href="${activationLink}" 
            style="display:inline-block; margin-top:20px; padding:12px 25px; background:#4f46e5; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:bold;">
            Activate my account
          </a>

          <p style="margin-top:30px; font-size:12px; color:#999;">
            If you didn’t create an account, you can safely ignore this email.
          </p>

        </div>
      </div>
    `;
      subject = 'Activation de votre compte',

      // Envoi mail
      await sails.helpers.sendmail(post.email, subject, html);

      delete(newUser.password)
      response.info = 'User created. Activation email sent to ' + post.email;
      response.data = newUser;
      responseStatus = 201;
    }

  } catch (error) {
    console.error(error);
    response.info = 'Server error';
    response.data = error.message;
    responseStatus = 500;
  }

  res.status(responseStatus);
  return res.json(response);
};
