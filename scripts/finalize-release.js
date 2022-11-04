
module.exports = async ({ github, context, core }) => {
  await github.rest.repos.deleteFile({
    ...context.repo,
    path: '.releasing',
    message: 'finalize release [skip ci]',
    sha: context.sha,
  })

  await github.rest.pulls.merge({
    ...context.repo,
    pull_number: context.payload.pull_request.number,
    merge_method: 'squash',
  })
}
