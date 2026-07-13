module.exports = {


  friendlyName: 'Getpartialtask',


  description: 'Getpartialtask something.',


  inputs: {
    id: { type: 'number'},
  },


  exits: {

    success: {
      description: 'All done.',
    },

  },


  fn: async function (inputs) {


    let task = await PartialTask.findOne({'id':inputs.id}).populate('partialActions').populate('actions');
    
    partialActions = []
    for (let action of task.partialActions){
      a = await PartialAction.findOne({'id':action.id}).populate('partialKnowledges');
      partialActions.push(a);
    }
    task.partialActions = partialActions

    actions = []
    for (let action of task.actions){
      a = await Action.findOne({'id':action.id}).populate('parameters');
      actions.push(a);
    }
    task.actions = actions

    return task

    // TODO
  }


};

