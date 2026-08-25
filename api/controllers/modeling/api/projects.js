/**
 * Module dependencies
 */

// ...


/**
 * modeling/api/projects.js
 *
 * Projects api.
 */
module.exports = async function projects(req, res) {
  let response = {
    info: 'An error occurred',
    data: {}
  };
  let status = 500;

  try {
    let projects = await Rawmodel.find({owner :  req.session.user.id})
    response.info = 'OK';
    response.data = projects;
    status = 200;

  } catch (error) {
    response.info = 'Server error';
    response.data = error.message;
    status = 500;
  }

  return res.status(status).json(response);


};
