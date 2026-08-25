/**
 * Module dependencies
 */

// ...


/**
 * modeling/api/project.js
 *
 * Project api.
 */
module.exports = async function project(req, res) {

  let response = {
    info: 'An error occurred',
    data: {}
  };
  let status = 500;
  try {
    let project = await Rawmodel.findOne({id :req.params['id'], owner :req.session.user.id })
    response.info = 'OK';
    response.data = project;
    status = 200;

  } catch (error) {
    response.info = 'Server error';
    response.data = error.message;
    status = 500;
  }
  
  return res.status(status).json(response);

};
