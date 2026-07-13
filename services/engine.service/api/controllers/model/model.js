/**
 * Module dependencies
 */


// ...


/**
 * model/model.js
 *
 * Model model.
 */
module.exports = async function model(req, res) {
  let post = req.body;

  // Create default task
  let defaultTask = await sails.helpers.savepartialtask(post.partialTask);

  // Create Model
  let partialModel = await PartialModel.create({
    name : post.name,
    owner : req.user.id,
    defaultTask : defaultTask.id
  }).fetch();

  perceptions = {}
  // Create Perceptions
  for (let i = 0; i < post.perceptions.length; i++) {
    let element = post.perceptions[i];
    let perception = await Perception.create({
      name :  element.name,
      strengthExpression :  element.strengthExpression,
      partialModel :  partialModel.id
    }).fetch();
    perceptions[perception.name] = perception.id
    for (let i = 0; i < element.senses.length; i++) {
      let ele = element.senses[i];
      ele.perception = perception.id,
      await Sense.create(ele)
    }
  }


  // Create Desires
  for (let i = 0; i < post.partialDesires.length; i++) {
    let element = post.partialDesires[i];
    let partialDesire = await sails.helpers.savepartialdesire(element, partialModel.id, perceptions);
  }
  
  return res.json(partialModel);
};
