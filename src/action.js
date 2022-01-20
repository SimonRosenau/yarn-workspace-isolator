const core = require('@actions/core');
const { run } = require("./index");

(async () => {
  try {
    const workspace = core.getInput('workspace', { required: true, trimWhitespace: true })
    const output = core.getInput('output', { required: true, trimWhitespace: true })

    await run({ workspaceName: workspace, outputFolder: output })
  } catch (error) {
    core.setFailed(error.message)
  }
})()
