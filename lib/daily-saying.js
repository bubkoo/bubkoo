const fs = require('fs')
const afs = require('node:fs/promises')
const path = require('path')
const mime = require('mime-types')
const fetch = require('node-fetch')
const { imageSize } = require('image-size')
const { getDate } = require('./util')

async function toDataURL(url) {
  const IMAGE_MOD = 0.5
  const IMAGE_BLUR = 2
  const IMAGE_WIDTH = 840
  const image_url = `https://images.weserv.nl?w=${IMAGE_WIDTH}&blur=${IMAGE_BLUR}&mod=${IMAGE_MOD}&url=${url}`
  const res = await fetch(image_url)
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

  const buffer = await res.buffer()
  const datauri = `data:${mime.lookup(filename)};base64,${buffer.toString('base64')}`
  return datauri
}

async function getPixel(url) {
  const arrayBuffer = await fetch(url).then((res) => res.arrayBuffer())
  const buffer = Buffer.from(arrayBuffer)
  const size = imageSize(buffer)
  if (size.width && size.height) {
    return size.width * size.height
  }
  if (size.width) {
    return size.width
  }

  return size.height || 0
}

async function api() {
  const resp = await fetch('http://open.iciba.com/dsapi')
  const data = await resp.json()
  const pics = [
    data.picture,
    data.picture2,
    data.picture3,
    data.picture4,
  ].filter((url) => url)
  let maxIndex = 3
  if (!pics[3]) {
    const pixelSize = await Promise.all(
      pics.map((url) => getPixel(url)),
    )
    const maxSize = Math.max(...pixelSize)
    maxIndex = pixelSize.indexOf(maxSize)
  }
  return {
    content: data.content,
    translation: data.note,
    picture: pics[maxIndex],
  }
}

async function makeSVG(date) {
  console.log('generate daily-saying svg...')
  const { content, translation, picture } = await api()
  console.log(`content: ${content}`)
  console.log(`translation: ${translation}`)
  console.log(`picture: ${picture}`)
  const datauri = await toDataURL(picture)

  const textBaseSize = 24;
  const enCharsPerLine = 72;
  const zhCharsPerLine = 32;
  const enLength = content.length;
  const zhLength = translation.length;
  const enEmSize = enCharsPerLine / enLength;
  const zhEmSize = zhCharsPerLine / zhLength;
  const enFontSize = enEmSize < 1 ? textBaseSize * enEmSize : textBaseSize
  const zhFontSize = zhEmSize < 1 ? textBaseSize * zhEmSize : textBaseSize

  const SVG_WIDTH = 840
  const SVG_HEIGHT = 360

  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${SVG_WIDTH}" height="${SVG_HEIGHT}" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}">
  <image href="${datauri}" width="100%"/>
  <g transform="translate(${SVG_WIDTH / 2},${SVG_HEIGHT / 2})">
    <text dy="-40" font-size="64">${date}</text>
    <text dy="40" font-size="${enFontSize}">${content}</text>
    <text dy="88" font-size="${zhFontSize}">${translation}</text>
  </g>
  <style>
    text {font-family: Helvetica, Arial, sans-serif; fill:#f0f0f0; dominant-baseline:middle; text-anchor:middle;}
  </style>
</svg>
      `.trim()
}

async function getCache(date) {
  const file = path.join(__dirname, `../cache/${date}.svg`)
  if (fs.existsSync(file)) {
    return afs.readFile(file, 'utf-8')
  }
  return null
}

async function setCache(date, svg) {
  fs.mkdirSync(path.join(__dirname, '../cache'), { recursive: true })
  const file = path.join(__dirname, `../cache/${date}.svg`)
  await afs.writeFile(file, svg)
}

module.exports = async function (req, res) {
  const date = getDate()
  let svg = await getCache(date)
  if (!svg) {
    svg = await makeSVG(date)
    setCache(date, svg)
  } else {
    console.log('return cached daily-saying svg')
  }
  res.type('image/svg+xml');
  res.send(svg);
}
