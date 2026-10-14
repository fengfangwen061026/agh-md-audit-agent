/* Verify every distributed file against manifest.json; no external dependencies.
 * Usage: node scripts/verify_manifest.mjs (work package)
 *        node verify_manifest.mjs (evidence package). */
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
const here = dirname(fileURLToPath(import.meta.url))
const root = here.endsWith(`${sep}scripts`) ? resolve(here, '..') : here
const manifest = JSON.parse(await readFile(resolve(root, 'manifest.json'), 'utf8'))
const errors = []
for (const file of manifest.files) {
    const absolute = resolve(root, file.path)
    if (!absolute.startsWith(`${root}${sep}`)) throw new Error('Unsafe manifest path')
    try {
        const bytes = await readFile(absolute)
        if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) errors.push(file.path)
    } catch { errors.push(file.path) }
}
console.log(JSON.stringify({ files_checked: manifest.files.length, all_checks_passed: errors.length === 0, errors }, null, 2))
if (errors.length) process.exitCode = 1
