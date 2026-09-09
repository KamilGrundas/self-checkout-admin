import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

// Preserve generator formatting while removing whitespace on blank lines.
async function normalize(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await normalize(path)
    else if (entry.name.endsWith(".ts")) {
      const source = await readFile(path, "utf8")
      await writeFile(path, source.replace(/[\t ]+$/gm, ""))
    }
  }
}

await normalize(process.argv[2])
