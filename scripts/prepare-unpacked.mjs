import { createPackage } from '@electron/asar'
import { rcedit } from 'rcedit'
import { cp, mkdir, rm, rename } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const unpacked = path.join(root, 'release', 'win-unpacked')
const resources = path.join(unpacked, 'resources')
const staging = path.join(root, 'build', 'app-staging')
const sourceExe = path.join(unpacked, 'electron.exe')
const productExe = path.join(unpacked, 'DaemonCore Academy.exe')

await rm(staging, { recursive: true, force: true })
await mkdir(staging, { recursive: true })
await cp(path.join(root, 'dist'), path.join(staging, 'dist'), { recursive: true })
await cp(path.join(root, 'electron'), path.join(staging, 'electron'), { recursive: true })
await cp(path.join(root, 'package.json'), path.join(staging, 'package.json'))

await rm(path.join(resources, 'default_app.asar'), { force: true })
await rm(path.join(resources, 'app.asar'), { force: true })
await createPackage(staging, path.join(resources, 'app.asar'))

await rm(productExe, { force: true })
await rename(sourceExe, productExe)
await rcedit(productExe, {
  icon: path.join(root, 'build', 'icon.ico'),
  'file-version': '0.1.0.0',
  'product-version': '0.1.0.0',
  'version-string': {
    CompanyName: 'DaemonCore Academy',
    FileDescription: 'DaemonCore Academy',
    InternalName: 'DaemonCore Academy',
    OriginalFilename: 'DaemonCore Academy.exe',
    ProductName: 'DaemonCore Academy',
  },
})

console.log('Prepared branded Windows application bundle')
