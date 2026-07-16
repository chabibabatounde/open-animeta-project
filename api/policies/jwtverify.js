// api/policies/my-middleware.js
const jwt = require("jsonwebtoken");

module.exports = async function (req, res, proceed) {

    try {
        let token = req.headers.authorization;

        if (!token) {
            return res.status(401).json({
                info: 'Token required',
                data: {}
            });
        }
        token = token.replace('Bearer ', '');

        let decoded = jwt.verify(token, 'sails.config.custom.jwtSecret');
        req.user = decoded;
        return proceed();

    } catch (err) {
        return res.status(401).json({
            info: 'Access denied',
            data: {}
        });
    }
};