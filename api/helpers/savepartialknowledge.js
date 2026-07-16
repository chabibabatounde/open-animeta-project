
module.exports = {


  friendlyName: 'Savepartialknowledge',


  description: 'Savepartialknowledge something.',


  inputs: {
    data: { type: 'json'},
    partialAction: { type: 'number'},
    partialDesire: { type: 'number'},
  },


  exits: {

    success: {
      description: 'All done.',
    },

  },

  fn: async function (inputs) {
    let data = inputs.data
    return await PartialKnowledge.create(data).fetch();
  }

};

