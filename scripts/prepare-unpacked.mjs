import { createPackage } from '@electron/asar'
import { rcedit } from 'rcedit'
import { access, cp, mkdir, readFile, rm, rename } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const unpacked = path.join(root, 'release', 'win-unpacked')
const resources = path.join(unpacked, 'resources')
const staging = path.join(root, 'build', 'app-staging')
const sourceExe = path.join(unpacked, 'electron.exe')
const productExe = path.join(unpacked, 'DaemonCore Academy.exe')
const metadata = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'))
const windowsVersion = `${metadata.version}.0`

await rm(staging, { recursive: true, force: true })
await mkdir(staging, { recursive: true })
await cp(path.join(root, 'dist'), path.join(staging, 'dist'), { recursive: true })
await cp(path.join(root, 'electron'), path.join(staging, 'electron'), { recursive: true })
await cp(path.join(root, 'package.json'), path.join(staging, 'package.json'))
await rm(path.join(resources, 'ranges'), { recursive: true, force: true })
await cp(path.join(root, 'ranges'), path.join(resources, 'ranges'), { recursive: true })

await rm(path.join(resources, 'default_app.asar'), { force: true })
await rm(path.join(resources, 'app.asar'), { force: true })
await createPackage(staging, path.join(resources, 'app.asar'))

try {
  await access(sourceExe)
  await rm(productExe, { force: true })
  await rename(sourceExe, productExe)
} catch {
  await access(productExe)
}
await rcedit(productExe, {
  icon: path.join(root, 'build', 'icon.ico'),
  'file-version': windowsVersion,
  'product-version': windowsVersion,
  'version-string': {
    CompanyName: 'DaemonCore Academy',
    FileDescription: 'DaemonCore Academy',
    InternalName: 'DaemonCore Academy',
    OriginalFilename: 'DaemonCore Academy.exe',
    ProductName: 'DaemonCore Academy',
  },
})

console.log('Prepared branded Windows application bundle')
