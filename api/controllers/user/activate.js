/**
 * Module dependencies
 */

// ...
/**
 * user/activate.js
 *
 * Activate user.
 */
// api/controllers/user/activate.js

module.exports = async function (req, res) {

  let response = {
    info: 'An error occurred',
    data: {}
  };
  let responseStatus = 500;

  try {

    let token = req.params.token;

    if (!token) {
      response.info = 'Activation token is required';
      responseStatus = 400;
      return res.status(responseStatus).json(response);
    }

    let user = await User.findOne({
      activationToken: token
    });

    if (!user) {
      response.info = 'Invalid token';
      responseStatus = 404;
      return res.status(responseStatus).json(response);
    }

    // Activation
    await User.updateOne({ id: user.id }).set({
      isActive: true,
      userStatus: 2,
    });

    response.info = 'Account identified by <<'+user.email+'>> is successfully activated';
    responseStatus = 200;

    return res.status(responseStatus).json(response);

  } catch (err) {
    return res.serverError(err);
  }
};
