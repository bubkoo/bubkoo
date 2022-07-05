function padDateNumber(m) {
  return m > 9 ? `${m}` : `0${m}`
}

module.exports = async ({ github, context, core, svg: content }) => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = padDateNumber(now.getMonth() + 1)
  const dd = padDateNumber(now.getDate())

  const filename = `${yyyy}-${mm}-${dd}.svg`
  const filepath = `assets/coder-calendar/${filename}`

  const getContent = async () => {
    try {
      return await github.rest.repos.getContent({
        ...context.repo,
        path: filepath,
      })
    } catch (e) {
      return null
    }
  }

  const res = await getContent(github, filepath)
  const oldContent = res
    ? Buffer.from(res.data.content, 'base64').toString()
    : null
  if (oldContent !== content) {
    await github.rest.repos.createOrUpdateFileContents({
      ...context.repo,
      path: filepath,
      content: Buffer.from(content).toString('base64'),
      message: `chore: ${oldContent != null ? 'update' : 'generate'
        } coder-calender svg [skip ci]`,
      sha: res ? res.data.sha : undefined,
    })
    core.info(`File "${filepath}" ${oldContent ? 'updated' : 'generated'}`)
  } else {
    core.info(`File "${filepath}" no need to update`)
  }

  return filepath
}
