const os = require('os')
const fs = require('fs')
const util = require('util')
const path = require('path')
const mime = require('mime-types')
const fetch = require('node-fetch')
const { extractColors } = require('extract-colors')
const streamPipeline = util.promisify(require('stream').pipeline)

function hex2rgb(hex) {
  const color = hex.indexOf('#') === 0 ? hex : `#${hex}`
  let val = Number(`0x${color.substr(1)}`)
  if (!(color.length === 4 || color.length === 7) || Number.isNaN(val)) {
    throw new Error('Invalid hex color.')
  }

  const bits = color.length === 4 ? 4 : 8
  const mask = (1 << bits) - 1
  const bgr = ['b', 'g', 'r'].map(() => {
    const c = val & mask
    val >>= bits
    return bits === 4 ? 17 * c : c
  })

  return [bgr[2], bgr[1], bgr[0]]
}

function rgb2hex(r, g, b) {
  const pad = (hex) => (hex.length < 2 ? `0${hex}` : hex)
  return `${pad(r.toString(16))}${pad(g.toString(16))}${pad(b.toString(16))}`
}

function invertColor(color, bw) {
  const [r, g, b] = hex2rgb(color)
  if (bw) {
    // http://stackoverflow.com/a/3943023/112731
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#ffffff'
  }

  return `${pound ? '#' : ''}${rgb2hex(255 - r, 255 - g, 255 - b)}`
}

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
    colors.sort((a, b) => b.area - a.area)
    core.info(`main color: ${colors[0].hex}`)

    const invertedColor = invertColor(colors[0].hex, true)
    core.info(`inverted color: ${invertedColor}`)
    return invertedColor
  } catch (error) {
    core.info(error)
    return '#ffffff';
  }


}
