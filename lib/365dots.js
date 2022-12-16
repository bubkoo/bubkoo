const { generate } = require('@365dots/svg');
const camelCase = require('lodash.camelcase');

module.exports = function (req, res) {
    const qs = req.query;
    const options = {};
    Object.keys(qs).forEach(key => {
        options[camelCase(key)] = qs[key];
    });

    const image = generate(options);
    res.header('cache-control', 'max-age=600');
    res.type('image/svg+xml');
    res.send(image);
}
