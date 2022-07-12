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

function padDateNumber(m) {
  return m > 9 ? `${m}` : `0${m}`
}

const now = new Date()
const yyyy = now.getFullYear()
const mm = padDateNumber(now.getMonth() + 1)
const dd = padDateNumber(now.getDate())
const date = `${yyyy}-${mm}-${dd}`
const targetDir = 'assets/daily-saying'

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
      message: `chore:${oldContent ? 'update' : 'upload'} ${msg} [skip ci]`,
      sha: res ? res.data.sha : undefined,
    })
  }
}


async function uploadBackgroundImage(github, context, url) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`unexpected response ${res.statusText}`)
  }

  let ext = path.extname(url)
  if ((/\.(gif|jpe?g|tiff?|png|webp|bmp)$/i).test(ext)) {
    const type = res.headers.get('Content-Type')
    ext = type ? `.${mime.extension(type) || 'png'}` : '.png'
  }

  const filepath = path.join(targetDir, `${date}${ext}`)

  const buffer = await res.arrayBuffer()
  const newContent = Buffer.from(buffer).toString('base64')

  await createOrUpdateFile(github, context, filepath, newContent, 'daily saying background image')

  return filepath
}

function getInvertedColor(bgPath) {}



module.exports = async ({ github, context, core, url }) => {
  try {

    const cachedUrl = `https://images.weserv.nl?blur=2&mod=0.5&url=${url}`
    const bgPath = await uploadBackgroundImage(github, context, cachedUrl)
    const colors = await extractColors(path.join(process.cwd(), bgPath))
    core.info(JSON.stringify(colors, null, 2))
    colors.sort((a, b) => b.area - a.area)
    core.info(`main color: ${colors[0].hex}`)

    const invertedColor = invertColor(colors[0].hex, true)
    core.info(`inverted color: ${invertedColor}`)

    const svgPath = path.join(targetDir, `${date}.svg`)
    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="960" height="540" viewBox="0 0 960 540">
  <image href="${bgPath}" height="100%" width="100%"/>
  <text transform="translate(480,270)" dy="-40" font-size="96">2022-07-12</text>
  <text transform="translate(480,270)" dy="24" font-size="16">At that time, youth was blooming, with the sun blazing and wind kissing the treetop.</text>
  <text transform="translate(480,270)" dy="56" font-size="16">人间骄阳正好，风过树梢，彼时他们正当年少。</text>
  <style>
  text {font-family: Helvetica, Arial, sans-serif; fill:${invertColor};  dominant-baseline:middle; text-anchor:middle;}
  </style>
</svg>
    `.trim()

    await createOrUpdateFile(github, context, svgPath, svgContent, 'daily saying')

    return svgPath
  } catch (error) {
    core.info(error)
  }
}
