module.exports = async ({ github, context, core }) => {
  console.log(context)

  const { prs } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
    ...context.repo,
    commit_sha: context.sha,
  });

  const pr =
    prs.find((item) =>
      context.payload.ref === `refs/heads/${item.head.ref}`
    ) || prs[0];

  if (pr) {
    const path = '.releasing'
    let res
    try {
      res = await github.rest.repos.getContent({
        ...context.repo,
        path,
        ref: context.ref,
      })
    } catch (e) {}

    if (res) {
      await github.rest.repos.deleteFile({
        ...context.repo,
        path,
        message: 'finalize release [skip ci]',
        sha: res.data.sha,
        branch: context.ref,
      })
    }

    await github.rest.pulls.merge({
      ...context.repo,
      pull_number: pr.number,
      merge_method: 'squash',
    })
  }
}
