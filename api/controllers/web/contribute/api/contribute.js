/**
 * Module dependencies
 */

// ...


/**
 * web/contribute/api/contribute.js
 *
 * Contribute api.
 */
module.exports = async function contribute(req, res) {

  let response = {
    info: 'An error occurred',
    data: {}
  };

  let status = 500;

  try {

    let post = req.body;

    let action  = await Proposalaction.create({
      name : post.name,
      description : post.description,
      code : post.implementation.code,
      language : post.implementation.language,
      //user : req.user.id
    }).fetch();

    for (let i = 0; i < post.references.length; i++) {
      let element = post.references[i];
      element.action = action.id;
      await Proposalactionreference.create(element);
    }

    for (let i = 0; i < post.attributes.length; i++) {
      let element = post.attributes[i];
      element.action = action.id;
      await Proposalattribute.create(element);
    }

    response.info = 'Proposed action saved';
    response.data = action;
    status = 200;

  } catch (error) {

    sails.log.error(error);

    response.info = 'Server error';
    response.data = error.message;
    status = 500;

  }

  return res.status(status).json(response);

};
