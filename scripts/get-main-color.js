const os = require('os')
const fs = require('fs')
const util = require('util')
const path = require('path')
const mime = require('mime-types')
const fetch = require('node-fetch')
const { extractColors } = require('extract-colors')
const streamPipeline = util.promisify(require('stream').pipeline)


module.exports = async ({ github, context, core, url }) => {
  try {
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`unexpected response ${res.statusText}`)
    }

    let filename = path.basename(url)
    if ((/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i).test(filename)) {
      const type = res.headers.get('Content-Type')
      const ext = type ? mime.extension(type) || 'png' : 'png'
      filename = `${new Date().getTime()}.${ext}`
    }
    const filepath = path.join(os.tmpdir(), filename)
    await streamPipeline(res.body, fs.createWriteStream(filepath))
    const colors = await extractColors(filepath)
    core.info(JSON.stringify(colors, null, 2))
    colors.sort((a, b) => a.area - b.area)
    return colors[0].hex
  } catch (error) {
    core.info(error)
    return '#ffffff';
  }


}
