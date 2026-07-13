
module.exports = {


  friendlyName: 'Savepartialtask',


  description: 'Savepartialtask something.',


  inputs: {
    data: { type: 'json'},
  },


  exits: {

    success: {
      description: 'All done.',
    },

  },


  fn: async function (inputs) {
    let data = inputs.data
    
    let partialTask = await PartialTask.create(
      {
        name : data.name,
        repeatAction: data.repeatAction,
        definedList: data.definedList,
        defTaskActionLen: data.defTaskActionLen,
        actionLen: data.actionLen,
      }
    ).fetch();

    for (let i = 0; i < data.partialActions.length; i++) {
      const element = data.partialActions[i];
      let partialAction = await PartialAction.create({name:element.name, partialTask:partialTask.id}).fetch();
      for (let j = 0; j < element.partialKnowledges.length; j++) {
        ele = element.partialKnowledges[j]
        ele.partialAction = partialAction.id;
        partialKnowledge =  await PartialKnowledge.create(ele).fetch();
      }
    }

    return partialTask;
  }


};

