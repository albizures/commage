import * as fs from 'node:fs/promises'
import path from 'node:path'
import { dency } from '@vyke/dency'
import { type Result, r } from '@vyke/results'
import { z } from 'zod'
import { type Command, commandSchema } from './command'
import { Config } from './config'
import { rootSola } from './sola'

const sola = rootSola.withTag('storage')

const storageContentSchema = z.object({
	commands: z.record(z.string(), commandSchema),
})

export type StorageContent = z.infer<typeof storageContentSchema>

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

		const stats = await r.to(fs.stat(dirname))

		if (!stats.ok || !stats.value.isDirectory()) {
			const mkdirResult = await r.to(fs.mkdir(dirname))

			if (!mkdirResult.ok) {
				sola.error(mkdirResult.value)
				return r.err(new Error(`writing the folder structure ${filename}`))
			}
		}

		const writeResult = await r.to(fs.writeFile(filename, JSON.stringify(content)))

		if (!writeResult.ok) {
			sola.error(writeResult.value)
			return r.err(new Error(`writing the file "${filename}"`))
		}

		return r.ok(content)
	}

	async readFile(): Promise<Result<StorageContent, Error>> {
		const { commands: filename } = this.config.files
		const stats = await r.to(fs.stat(filename))

		if (!stats.ok || !stats.value.isFile()) {
			return this.writeFile(defaultContent)
		}

		const readResult = await r.to(fs.readFile(filename, 'utf8'))

		if (!readResult.ok) {
			sola.error(readResult.value)
			return r.err(new Error(`reading the files "${filename}"`))
		}

		const parseResult = storageContentSchema.safeParse(JSON.parse(readResult.value))

		if (!parseResult.success) {
			sola.error(parseResult.error)
			return r.err(new Error(`parsing the content of ${filename}`))
		}

		return r.ok(parseResult.data)
	}
}
