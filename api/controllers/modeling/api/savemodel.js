/**
 * Module dependencies
 */

// ...


/**
 * modeling/api/savemodel.js
 *
 * Savemodel api.
 */
module.exports = async function savemodel(req, res) {

  
  let response = {
    info: 'An error occurred',
    data: {}
  };

  let status = 500;

  try {

    let post = req.body;

    let nodeCat = {
      root : [],
      perceptions : [],
      senses : [],
      desires : [],
      tasks : [],
      partialKnowledge : [],
      actions : []
    }

    for (const key in post.nodes) {
      const element = post.nodes[key];
      if (element.type == 'PM'){
        nodeCat.root.push(element.id)
      }

      else if(element.type == 'Px'){
        nodeCat.perceptions.push(element.id)
      }
      else if(element.type == 'Sx'){
        nodeCat.senses.push(element.id)
      }

      else if(element.type == 'D'){
        nodeCat.desires.push(element.id)
      }
      else if(element.type == 'PD'){
        nodeCat.desires.push(element.id)
      }


      else if(element.type == 'PT'){
        nodeCat.tasks.push(element.id)
      }

      else if(element.type == 'PA'){
        nodeCat.actions.push(element.id)
      }
      else if (/^Ax\d+$/.test(element.type)) {
        nodeCat.actions.push(element.id)
      }
      
      else if(element.type == 'PK'){
        nodeCat.partialKnowledge.push(element.id)
      }
    }

    let rawmodel = {
      jsondata : JSON.stringify(post),
      name : post.loadedModel.filename,
      owner: req.session.user.id,
      identity : post.loadedModel.id
    }
    if(post.loadedModel.modelName){
      rawmodel = await Rawmodel.updateOne({ id: post.loadedModel.id }).set(rawmodel)
      response.info = 'Proposed action edited';
      response.data = rawmodel;
      status = 200;
    }else{
      rawmodel = await Rawmodel.create(rawmodel)
      response.info = 'Proposed action saved';
      response.data = rawmodel;
      status = 200;
    }
    
    

  } catch (error) {
    sails.log.error(error);
    response.info = 'Server error';
    response.data = error.message;
    status = 500;
  }

  return res.status(status).json(response);

};
