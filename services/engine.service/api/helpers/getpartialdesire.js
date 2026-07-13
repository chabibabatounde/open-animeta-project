module.exports = {


  friendlyName: 'Getpartialdesire',


  description: 'Getpartialdesire something.',


  inputs: {
    id: { type: 'number'},
  },


  exits: {

    success: {
      description: 'All done.',
    },

  },


  fn: async function (inputs) {
    // TODO
    let d = await PartialDesire.findOne({'id':inputs.id});
    delete d.partialModel;
    let task = await sails.helpers.getpartialtask(d.partialTask)
    d.partialTask = task;
    return d
  }

};

