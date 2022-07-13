const os = require('os')
const fs = require('fs')
const path = require('path')
const mime = require('mime-types')
const fetch = require('node-fetch')
const { extractColors } = require('extract-colors')

const IMAGE_MOD = 0.5
const IMAGE_BLUR = 2
const SVG_WIDTH = 840
const SVG_HEIGHT = 360
const COLOR_BLACK = '#0f0f0f'
const COLOR_WHITE = '#f0f0f0'
const dirname = 'daily-saying'
const repoDir = `assets/${dirname}`
const tempDir = path.join(os.tmpdir(), dirname)

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
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? COLOR_BLACK : COLOR_WHITE``
  }

  return `${pound ? '#' : ''}${rgb2hex(255 - r, 255 - g, 255 - b)}`
}

async function download(url) {
  const res = await fetch(`https://images.weserv.nl?blur=${IMAGE_BLUR}&mod=${IMAGE_MOD}&w=${SVG_WIDTH}&h=${SVG_HEIGHT}&dpr=2&fit=cover&we&a=entropy&url=${url}`)
  if (!res.ok) {
    throw new Error(`unexpected response ${res.statusText}`)
  }

  let filename = path.basename(url)
  let ext = path.extname(filename)
  if (!(/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i).test(ext)) {
    const type = res.headers.get('Content-Type')
    ext = type ? `.${mime.extension(type) || 'png'}` : '.png'
    filename = `${new Date().getTime()}${ext}`
  }

  const filepath = path.join(tempDir, filename)
  const buffer = await res.buffer()
  const datauri = `data:${mime.lookup(filepath)};base64,${buffer.toString('base64')}`

  fs.mkdirSync(tempDir, { recursive: true })
  fs.appendFileSync(filepath, buffer)

  return {
    datauri,
    filepath,
  }
}

async function getContent(github, context, filepath) {
  try {
    return await github.rest.repos.getContent({
      ...context.repo,
      path: filepath,
    })
  } catch (e) {
    return null
  }
}

async function createOrUpdateFile(github, context, path, content, msg) {
  const res = await getContent(github, context, path)
  const oldContent = res
    ? Buffer.from(res.data.content, 'base64').toString()
    : null
  if (oldContent !== content) {
    await github.rest.repos.createOrUpdateFileContents({
      ...context.repo,
      path: path,
      content: content,
      message: `chore:${oldContent ? 'update' : 'create'} ${msg} [skip ci]`,
      sha: res ? res.data.sha : undefined,
    })
  }
}

module.exports = async ({ github, context, core, metadata }) => {
  try {
    core.info(JSON.stringify(metadata, null, 2))
    const { filepath, datauri } = await download(metadata.image)
    const colors = await extractColors(filepath)
    core.info(JSON.stringify(colors, null, 2))
    colors.sort((a, b) => b.area - a.area)
    core.info(`main color: ${colors[0].hex}`)
    const invertedColor = invertColor(colors[0].hex, true)
    core.info(`inverted color: ${invertedColor}`)

    const svgPath = path.join(repoDir, `${metadata.date}.svg`)
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">
  <image href="${datauri}" height="100%" width="100%"/>
  <g transform="translate(${SVG_WIDTH / 2},${SVG_HEIGHT / 2})">
    <text dy="-80" font-size="96">${metadata.date}</text>
    <text dy="20" font-size="18">${metadata.content}</text>
    <text dy="60" font-size="18">${metadata.translation}</text>
  </g>
  <style>
    text {font-family: Helvetica, Arial, sans-serif; fill:${invertedColor}; dominant-baseline:middle; text-anchor:middle;}
  </style>
</svg>
      `.trim()

    await createOrUpdateFile(
      github,
      context,
      svgPath,
      Buffer.from(svgContent).toString('base64'),
      'daily saying svg',
    )

    return svgPath
  } catch (error) {
    core.info(error)
  }
}
