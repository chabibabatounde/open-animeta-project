module.exports = {


  friendlyName: 'Sendmail',


  description: 'Sendmail something.',


  inputs: {
    to: { type: 'string', required: true },
    subject: { type: 'string', required: true },
    html: { type: 'string', required: true }
  },


  exits: {

    success: {
      description: 'All done.',
    },

  },


  fn: async function (inputs) {
    const nodemailer = require('nodemailer');
    let transporter = nodemailer.createTransport({
      host: 'mail69.lwspanel.com', // IMPORTANT
      port: 465,
      secure: true,
      auth: {
        user: 'no-reply@animeta.fr',
        pass: 'rV4!yjGSMRNGYsj'
      }
    });

    await transporter.sendMail({
      from: 'ANIMETA - Animal behavior modeling <no-reply@animeta.fr>',
      to: inputs.to,
      subject: inputs.subject,
      html: inputs.html
    });
  }


};





