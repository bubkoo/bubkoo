import os from 'os'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import extractColors from 'extract-colors'

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
