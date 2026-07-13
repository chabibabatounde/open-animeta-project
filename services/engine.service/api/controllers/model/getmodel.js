/**
 * Module dependencies
 */

// ...


/**
 * model/getmodel.js
 *
 * Getmodel model.
 */
module.exports = async function (req, res) {

  let response = {
    info: 'An error occurred',
    data: {}
  };

  let status = 500;

  try {

    let id = req.params.id;

    // ✅ 1. Validation
    if (!id) {
      return res.status(400).json({
        info: 'Model id is required'
      });
    }

    // ✅ 2. Récupération
    let model = await PartialModel.findOne({ id })
      .populate("perceptions")
      .populate("partialDesires")
      .populate("defaultTask");

    if (!model) {
      return res.status(404).json({
        info: 'Model not found'
      });
    }

    // ✅ 3. Sécurité
    delete model.owner;

    // ✅ 4. Deep populate perceptions
    if (Array.isArray(model.perceptions) && model.perceptions.length) {

      model.perceptions = await Promise.all(
        model.perceptions.map(async (p) => {
          return await sails.helpers.getperception(p.id);
        })
      );

    } else {
      model.perceptions = [];
    }

    // ✅ 5. Deep populate desires
    if (Array.isArray(model.partialDesires) && model.partialDesires.length) {

      model.partialDesires = await Promise.all(
        model.partialDesires.map(async (d) => {
          return await sails.helpers.getpartialdesire(d.id);
        })
      );

    } else {
      model.partialDesires = [];
    }

    // ✅ 6. Default task
    if (model.defaultTask && model.defaultTask.id) {
      model.defaultTask = await sails.helpers.getpartialtask(model.defaultTask.id);
    }

    // ✅ 7. Response OK
    response.info = 'Model retrieved successfully';
    response.data = model;
    status = 200;

  } catch (error) {

    sails.log.error(error);

    response.info = 'Server error';
    response.data = error.message;
    status = 500;

  }

  return res.status(status).json(response);
};