module.exports = {


  friendlyName: 'Savepartialdesire',


  description: 'Savepartialdesire something.',


  inputs: {
    data: { type: 'json'},
    model : {type:'number'},
    perceptions: { type: 'json'},
  },


  exits: {

    success: {
      description: 'All done.',
    },

  },


  fn: async function (inputs) {
    let data = inputs.data
    let partialTask = await sails.helpers.savepartialtask(data.partialTask);
    let perceptions = []
    for (let p = 0; p < data.perceptions.length; p++) {
      const element = data.perceptions[p];
      perceptions.push(inputs.perceptions[element])
    }

    let partialDesire = await PartialDesire.create({
      name : data.name,
      testString : data.testString,
      desc : data.desc,
      partialTask : partialTask.id,
      partialModel : inputs.model,
      perceptions : perceptions
    }).fetch();
    
    for (let p = 0; p < data.partialKnowledges.length; p++) {
      const element = data.partialKnowledges[p];
      element.partialDesire = partialDesire.id;
      partialKnowledge =  await PartialKnowledge.create(element).fetch();
    }

    //perceptions
    return partialDesire;
    // TODO
  }


};

