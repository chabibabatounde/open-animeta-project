/**
 * Module dependencies
 */


// ...


/**
 * model/model.js
 *
 * Model model.
 */
module.exports = async function (req, res) {

  let response = {
    info: 'An error occurred',
    data: {}
  };

  let status = 500;

  try {

    let post = req.body;

    // ✅ 1. Validation
    if (!post.name) {
      return res.status(400).json({
        info: 'Model name is required'
      });
    }

    if (!post.partialTask) {
      return res.status(400).json({
        info: 'Default task is required'
      });
    }

    if (!Array.isArray(post.perceptions)) {
      return res.status(400).json({
        info: 'Perceptions must be an array'
      });
    }

    if (!Array.isArray(post.partialDesires)) {
      return res.status(400).json({
        info: 'Partial desires must be an array'
      });
    }

    // ✅ 2. Create default task
    let defaultTask = await sails.helpers.savepartialtask(post.partialTask);

    if (!defaultTask || !defaultTask.id) {
      throw new Error('Default task creation failed');
    }

    // ✅ 3. Create PartialModel
    let partialModel = await PartialModel.create({
      name: post.name,
      owner: req.user.id,
      defaultTask: defaultTask.id
    }).fetch();

    let perceptionsMap = {};

    // ✅ 4. Create Perceptions + Senses
    for (let perceptionInput of post.perceptions) {

      if (!perceptionInput.name) continue;

      let perception = await Perception.create({
        name: perceptionInput.name,
        strengthExpression: perceptionInput.strengthExpression,
        partialModel: partialModel.id
      }).fetch();

      perceptionsMap[perception.name] = perception.id;

      // ✅ senses
      if (Array.isArray(perceptionInput.senses)) {
        for (let senseInput of perceptionInput.senses) {

          await Sense.create({
            ...senseInput,
            perception: perception.id
          });

        }
      }
    }

    // ✅ 5. Create PartialDesires
    for (let desireInput of post.partialDesires) {

      await sails.helpers.savepartialdesire(
        desireInput,
        partialModel.id,
        perceptionsMap
      );

    }

    // ✅ 6. Success response
    response.info = 'Partial model created successfully';
    response.data = partialModel;
    status = 201;

  } catch (error) {

    sails.log.error(error);

    response.info = 'Server error';
    response.data = error.message;
    status = 500;

  }

  return res.status(status).json(response);
};
