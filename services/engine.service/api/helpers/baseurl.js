module.exports = {


  friendlyName: 'Baseurl',


  description: 'Baseurl something.',


  inputs: {

  },


  exits: {

    success: {
      description: 'All done.',
    },

  },


  fn: async function (inputs) {
    return 'http://localhost:1337'
  }


};

