const jwt = require("jsonwebtoken");

module.exports = {


  friendlyName: 'Jwtverify',


  description: 'Jwtverify something.',


  inputs: {
    req: { type: 'json'},
  },


  exits: {
    success: {
      description: 'All done.',
    },
  },


  fn: async function (inputs) {
    let token = inputs.req.headers.authorization;
    if (!token) {
      let response = {
        info: 'Token required',
        data: {}
      };
      let responseStatus = 500;
      return res.status(responseStatus).json(response);
    }
    try {
      token = token.replace('Bearer ', '');
      let decoded = jwt.verify(token, 'sails.config.custom.jwtSecret');
      req.user = decoded;
      //return proceed();
    } catch (err) {
      let response = {
        info: 'Access denied',
        data: {}
      };
      let responseStatus = 403;
      return res.status(responseStatus).json(response);
    }
  }
};

