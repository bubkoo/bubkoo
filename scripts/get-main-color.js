const os = require('os')
const fs = require('fs')
const path = require('path')
const fetch = require('node-fetch')
const { extractColors } = require('extract-colors')

module.exports = async ({ github, context, core, url }) => {
  try {
    const filename = path.basename(url) || `${new Date().getTime()}.png`
    const filepath = path.join(os.tmpdir(), filename)
    const res = await fetch(url)
    res.body.pipe(fs.createWriteStream(filepath))
    const colors = extractColors(filepath)
    colors.sort((a, b) => a.area - b.area)
    core.info(JSON.stringify(colors, null, 2))
    return colors[0].hex
  } catch (error) {
    core.info(error)
    return '#ffffff';
  }


}
