
module.exports = async ({ github, context, core }) => {
  const path = '.releasing'
  const res = await github.rest.repos.getContent({
      ...context.repo,
      path: path,
    })
  
  await github.rest.repos.deleteFile({
    ...context.repo,
    path: '.releasing',
    message: 'finalize release [skip ci]',
    sha: res.data.sha,
  })

  await github.rest.pulls.merge({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
    merge_method: 'squash',
  })
}
