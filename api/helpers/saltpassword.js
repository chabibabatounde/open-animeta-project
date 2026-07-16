module.exports = {


  friendlyName: 'Saltpassword',


  description: 'Saltpassword something.',


  inputs: {
    chaine : {
      type : 'string'
    }
  },


  exits: {

    success: {
      description: 'All done.',
    },

  },


  fn: async function (inputs) {
    var md5Algo = require('md5');
    var sufixe  = "983Y89Y3fif;:;gklzhè_&&-(é((_è~]ô]é_çyé_tèéty";
    var prefixe = "2JS839Y9lkd,;,hzY_ÈBHJBGÈ_')!ë&)";
    var nPassword = md5Algo(prefixe+inputs.chaine+sufixe);
    return nPassword;
  }


};

