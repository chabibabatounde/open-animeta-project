module.exports = {


  friendlyName: 'Getperception',


  description: 'Getperception something.',


  inputs: {
    id: { type: 'number'},
  },


  exits: {

    success: {
      description: 'All done.',
    },

  },


  fn: async function (inputs) {

    let p = await Perception.findOne({'id':inputs.id}).populate('senses')
    delete p.animetaModel
    delete p.partialModel
    return p;

    // TODO
  }


};

