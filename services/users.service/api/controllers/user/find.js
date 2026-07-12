/**
 * Module dependencies
 */

// ...


/**
 * user/find.js
 *
 * Find user.
 */
module.exports = async function find(req, res) {
  let response = {
    info : 'An error occured',
    data: {}
  };
  let responseStatus = 500;

  let post = req.body;
  let user = await User.find({
    email :  post.email
  }).populate('userType').populate('userStatus');

  if(user && user.length==1){
    response.info = 'User data for '+post.email;
    response.data = user;
    responseStatus = 200;
  }
  else{
    response.info = 'User <<'+post.email+'>> not not found';
    response.data = {};
    responseStatus = 404;

  }

  res.status(responseStatus);
  return res.json(response);

};
