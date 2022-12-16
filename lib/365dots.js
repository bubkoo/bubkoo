const { generate } = require('@365dots/svg')
const camelCase = require('lodash.camelcase')
const { getDate } = require('./util')

const cache = {}

module.exports = function (req, res) {
    const qs = req.query
    const date = getDate()
    const cacheKey = `${date}_${qs}`
    let svg = cache[cacheKey]
    if (!svg) {
        const options = {}
        Object.keys(qs).forEach(key => {
            options[camelCase(key)] = qs[key]
        })

        svg = generate(options)
        cache[cacheKey] = svg
    }
    res.type('image/svg+xml')
    res.send(svg)
}
