/* Some ZIP extractors discard POSIX executable bits. Restore only the two
 * bundled macOS helpers required by AGH daemon identity checks. */
import { chmod, stat } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
if (process.platform === 'darwin') {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    for (const name of ['macos-process-identity', 'macos-live-app-identity']) {
        const helper = resolve(root, 'runtime/native', name)
        const info = await stat(helper)
        if ((info.mode & 0o111) !== 0o111) await chmod(helper, info.mode | 0o111)
    }
}
