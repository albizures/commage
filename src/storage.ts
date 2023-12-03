import * as fs from 'node:fs/promises'
import path from 'node:path'
import { dency } from '@vyke/dency'
import { to } from 'only-fns/promises/await-to'
import { Err, Ok, type Result } from 'ts-results'
import { z } from 'zod'
import { type Command, commandSchema } from './command'
import { Config } from './config'
import { rootSola } from './sola'

const sola = rootSola.withTag('storage')

const storageContentSchema = z.object({
	commands: z.record(z.string(), commandSchema),
})

type StorageContent = z.infer<typeof storageContentSchema>

const defaultContent: StorageContent = {
	commands: {},
}

export type StorageManager = {
	readFile: () => Promise<Result<StorageContent, Error>>
	writeFile: (content: StorageContent) => Promise<Result<StorageContent, Error>>
}

export const StorageManager = dency.create<StorageManager>('storage')

export class JSONStorageManager implements StorageManager {
	static deps = [Config] as const

	constructor(private config: Config) { }

	async writeFile(content: StorageContent): Promise<Result<StorageContent, Error>> {
		const { commands: filename } = this.config.files
		const dirname = path.dirname(filename)

		const stats = await to(fs.stat(dirname))

		if (!stats.ok || !stats.data.isDirectory()) {
			const mkdirResult = await to(fs.mkdir(dirname))

			if (!mkdirResult.ok) {
				sola.error(mkdirResult.error)
				return Err(new Error(`writing the folder structure ${filename}`))
			}
		}

		const writeResult = await to(fs.writeFile(filename, JSON.stringify(content)))

		if (!writeResult.ok) {
			sola.error(writeResult.error)
			return Err(new Error(`writing the file "${filename}"`))
		}

		return Ok(content)
	}

	async readFile(): Promise<Result<StorageContent, Error>> {
		const { commands: filename } = this.config.files
		const stats = await to(fs.stat(filename))

		if (!stats.ok || !stats.data.isFile()) {
			return this.writeFile(defaultContent)
		}

		const readResult = await to(fs.readFile(filename, 'utf8'))

		if (!readResult.ok) {
			sola.error(readResult.error)
			return Err(new Error(`reading the files "${filename}"`))
		}

		const parseResult = storageContentSchema.safeParse(JSON.parse(readResult.data))

		if (!parseResult.success) {
			sola.error(parseResult.error)
			return Err(new Error(`parsing the content of ${filename}`))
		}

		return Ok(parseResult.data)
	}
}
