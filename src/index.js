const path = require('path')
const { copyDirAsync, readFileAsync, writeFileAsync } = require('./util/fileSystemAsync')
const { runCommandAsyncPipe } = require('./util/runCommandAsync')
const { flatten, uniq, mapValues } = require('lodash')

export async function run({ workspaceName, outputFolder }) {
  const rootFolder = path.resolve('.')
  const workspaces = await getWorkspaceInfo(rootFolder)
  const workspace = workspaces[workspaceName]
  const workspaceDependencies = getWorkspaceDependencies(workspaces, workspaceName)

  await copyDirAsync(path.join(rootFolder, workspace.location), outputFolder, filterIgnored)
  await localizeWorkspaceDependencies(
    path.join(outputFolder, 'package.json'),
    workspaces,
    path.join(outputFolder, 'node_modules')
  )

  await Promise.all(
    workspaceDependencies.map(async wd => {
      await copyDirAsync(
        path.join(rootFolder, workspaces[wd].location),
        path.join(outputFolder, 'node_modules', wd),
        filterIgnored
      )
      await localizeWorkspaceDependencies(
        path.join(outputFolder, 'node_modules', wd, 'package.json'),
        workspaces,
        path.join(outputFolder, 'node_modules')
      )
    })
  )
}

async function getWorkspaceInfo(rootFolder) {
  const stdout = await runCommandAsyncPipe(rootFolder, 'yarn', ['--silent', 'workspaces', 'info'])
  return JSON.parse(stdout.toString('utf8'))
}

function getWorkspaceDependencies(workspaces, workspaceName) {
  const workspace = workspaces[workspaceName]
  const subWorkspaceDependencies = flatten(
    workspace.workspaceDependencies.map(w => getWorkspaceDependencies(workspaces, w))
  )
  const { workspaceDependencies } = workspace
  return uniq([...subWorkspaceDependencies, ...workspaceDependencies])
}

async function localizeWorkspaceDependencies(packageJsonFile, workspaces, localNodeModulesFolder) {
  const packageJson = JSON.parse(await readFileAsync(packageJsonFile))
  const nextPackageJson = {
    ...packageJson,
    dependencies: mapValues(packageJson.dependencies || {}, (ver, dep) => {
      if (!!workspaces[dep]) {
        return 'file:' + path.join(localNodeModulesFolder, dep)
      } else {
        return ver
      }
    }),
  }
  await writeFileAsync(packageJsonFile, JSON.stringify(nextPackageJson, null, 2))
}

function filterIgnored(stat, filepath, filename) {
  // TODO
  return true
}
