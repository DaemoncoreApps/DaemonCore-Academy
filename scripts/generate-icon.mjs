import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { mkdir, writeFile } from 'node:fs/promises'

await mkdir('build/icon-sizes', { recursive: true })
const sizes = [16, 24, 32, 48, 64, 128, 256]
const pngs = []

for (const size of sizes) {
  const path = `build/icon-sizes/${size}.png`
  await sharp('build/icon.svg').resize(size, size).png().toFile(path)
  pngs.push(path)
}

await writeFile('build/icon.ico', await pngToIco(pngs))
console.log('Generated build/icon.ico')
