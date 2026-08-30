import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { mkdir, writeFile } from 'node:fs/promises'

await mkdir('build/icon-sizes', { recursive: true })
await mkdir('build/icons', { recursive: true })
const sizes = [16, 24, 32, 48, 64, 128, 256, 512]
const pngs = []

for (const size of sizes) {
  const path = `build/icon-sizes/${size}.png`
  await sharp('build/icon.svg').resize(size, size).png().toFile(path)
  await sharp('build/icon.svg').resize(size, size).png().toFile(`build/icons/${size}x${size}.png`)
  if (size <= 256) pngs.push(path)
}

await writeFile('build/icon.ico', await pngToIco(pngs))
console.log('Generated Windows ICO and Linux PNG icon set')
