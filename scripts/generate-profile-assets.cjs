const { mkdir, writeFile } = require('node:fs/promises')
const { join } = require('node:path')
const { generate } = require('@365dots/svg')

const escapeXml = (value) => value.replace(/[&<>]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;',
})[char])

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response
}

async function dailySaying(date) {
  const { content, note, picture4, picture3, picture2, picture } =
    await (await download('https://open.iciba.com/dsapi')).json()
  const background = picture4 || picture3 || picture2 || picture
  if (!content || !note || !background) throw new Error('Incomplete daily saying')

  const imageUrl = new URL('https://images.weserv.nl/')
  imageUrl.search = new URLSearchParams({ w: '840', blur: '2', mod: '0.5', url: background })
  const response = await download(imageUrl)
  const type = response.headers.get('content-type')?.split(';')[0]
  if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) {
    throw new Error(`Unexpected background type: ${type}`)
  }
  const image = Buffer.from(await response.arrayBuffer())
  if (!image.length) throw new Error('Empty background')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="840" height="360" viewBox="0 0 840 360">
  <image href="data:${type};base64,${image.toString('base64')}" width="840" height="360" preserveAspectRatio="xMidYMid slice"/>
  <g transform="translate(420,180)" fill="#f0f0f0" text-anchor="middle" dominant-baseline="middle" font-family="Helvetica, Arial, sans-serif">
    <text y="-40" font-size="64">${date}</text>
    <text y="40" font-size="${24 * Math.min(1, 72 / content.length)}">${escapeXml(content)}</text>
    <text y="88" font-size="${24 * Math.min(1, 32 / note.length)}">${escapeXml(note)}</text>
  </g>
</svg>
`
}

async function main() {
  const output = process.argv[2]
  if (!output) throw new Error('Specify an output directory')

  process.env.TZ = 'Asia/Shanghai'
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: process.env.TZ }).format()
  const saying = await dailySaying(date)
  const dots = generate()

  await mkdir(output, { recursive: true })
  await Promise.all([
    writeFile(join(output, 'daily-saying.svg'), saying),
    writeFile(join(output, '365dots.svg'), dots),
  ])
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
