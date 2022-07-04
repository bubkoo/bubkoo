import path from 'path'
import gitOwner from 'git-username'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { generateSVG } from '@coder-calendar/svg'

function getOctokit() {
  const token = core.getInput('GITHUB_TOKEN', { required: true })
  return github.getOctokit(token)
}

async function getContent(
  octokit: ReturnType<typeof getOctokit>,
  path: string,
) {
  try {
    return await octokit.rest.repos.getContent({
      ...github.context.repo,
      path,
    })
  } catch (e) {
    return null
  }
}

function getOptions() {
  return {
    dir: core.getInput('dir'),
    commitMessage: core.getInput('commit_message'),
  }
}

export function padDateNumber(m: number) {
  return m > 9 ? `${m}` : `0${m}`
}

async function run() {
  try {
    const options = getOptions()
    const octokit = getOctokit()
    const username = gitOwner()
    const content = generateSVG(username || '')

    core.debug(JSON.stringify(options, null, 2))
    core.debug(`git owner: ${username}`)

    core.setOutput('svg', content)

    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = padDateNumber(now.getMonth() + 1)
    const dd = padDateNumber(now.getDate())
    const filename = `${yyyy}-${mm}-${dd}.svg`
    const filepath = path.join(options.dir, filename)
    const res = await getContent(octokit, filepath)
    const oldContent = res
      ? Buffer.from((res.data as any).content, 'base64').toString()
      : null

    if (oldContent !== content) {
      await octokit.rest.repos.createOrUpdateFileContents({
        ...github.context.repo,
        path: filepath,
        content: Buffer.from(content).toString('base64'),
        message: options.commitMessage,
        sha: res ? (res.data as any).sha : undefined,
      })
      core.info(`File "${filepath}" ${oldContent ? 'updated' : 'generated'}`)
    } else {
      core.info(`File "${filepath}" no need to update`)
    }

    core.setOutput('file', filepath)
  } catch (e) {
    core.error(e)
    core.setFailed(e.message)
  }
}

run()
