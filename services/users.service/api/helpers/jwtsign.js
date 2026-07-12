const jwt = require("jsonwebtoken");

module.exports = {


  friendlyName: 'Jwtsign',


  description: 'Jwtsign something.',


  inputs: {
    data: { type: 'json'},
  },


  exits: {

    success: {
      description: 'All done.',
    },

  },

  fn: async function (inputs) {
    let token = jwt.sign(
      inputs.data,
      'sails.config.custom.jwtSecret',
      {
        expiresIn: '7d'
      }
    );
    return token
  }
};

