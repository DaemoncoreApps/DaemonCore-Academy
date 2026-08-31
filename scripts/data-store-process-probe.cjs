const { DataStore } = require('../electron/data-store.cjs')

async function main() {
  const [directory, action, handle] = process.argv.slice(2)
  if (!directory || !['snapshot', 'onboard'].includes(action)) throw new Error('Usage: data-store-process-probe.cjs <directory> <snapshot|onboard> [handle]')
  const store = new DataStore(directory)
  let state = await store.initialize()
  if (action === 'onboard') state = await store.onboard(handle)
  process.stdout.write(JSON.stringify({ schemaVersion: state.schemaVersion, handle: state.profile.handle, createdAt: state.profile.createdAt }))
}

main().catch(error => { console.error(error); process.exitCode = 1 })
