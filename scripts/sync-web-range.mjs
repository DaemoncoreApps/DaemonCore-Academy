import { mkdir, writeFile } from 'node:fs/promises'
import { webLabCatalog } from '../src/web-labs.js'

const directory = new URL('../ranges/web-range/', import.meta.url)
await mkdir(directory, { recursive: true })
const definitions = webLabCatalog.map(({ id, title, category, difficulty, brief, submission }) => ({ id, title, category, difficulty, brief, submission }))
await writeFile(new URL('labs.json', directory), `${JSON.stringify(definitions, null, 2)}\n`, 'utf8')
console.log(`Synchronized ${definitions.length} Web Forge scenario contracts`)
