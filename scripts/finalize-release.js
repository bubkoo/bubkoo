module.exports = async ({ github, context, core }) => {
  console.log(context,github)
  const path = '.releasing'
  const res = await github.rest.repos.getContent({
      ...context.repo,
      path,
      ref: context.ref,
    })

  if(res){
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
    pull_number: context.payload.pull_request.number,
    merge_method: 'squash',
  })
}
