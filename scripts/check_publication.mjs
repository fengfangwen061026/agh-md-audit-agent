/* Generic publication guard; prints file names, never matching secret values. */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const hits = []
let count = 0
const secret = /(?:gh[pousr]_[A-Za-z0-9]{24,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/u
const privatePath = new RegExp('(?:' + '/' + 'Users|' + '/' + 'home)' + '/' + '[A-Za-z0-9._-]+' + '/' + '(?:Documents|Desktop|Downloads|[.]ssh|[.]config)')
async function walk(folder) {
    for (const item of await readdir(folder, { withFileTypes: true })) {
        if (['.git', 'outputs', 'execution_evidence', 'node_modules'].includes(item.name)) continue
        const file = join(folder, item.name)
        if (item.isDirectory()) await walk(file)
        else if (item.isFile()) {
            count += 1
            if (/[.](?:dcd|xtc|trj|prmtop|inpcrd|pem|key)$/iu.test(item.name) || ['.env', 'configuration.json', 'secrets.json'].includes(item.name)) hits.push({ file: file.slice(root.length + 1), kind: 'private payload name' })
            const value = (await readFile(file)).toString('utf8')
            if (secret.test(value)) hits.push({ file: file.slice(root.length + 1), kind: 'credential pattern' })
            if (privatePath.test(value)) hits.push({ file: file.slice(root.length + 1), kind: 'private workspace path' })
        }
    }
}
await walk(root)
console.log(JSON.stringify({ files_checked: count, all_checks_passed: hits.length === 0, findings: hits }, null, 2))
if (hits.length) process.exitCode = 1
