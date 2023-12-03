import Handlebars from 'handlebars'
import { dency } from '@vyke/dency'
import { Ok, type Result } from 'ts-results'
import { execa } from 'execa'
import type { Command } from './command'
import { StorageManager } from './storage'
import { rootSola } from './sola'

const sola = rootSola.withTag('command-center')

export type CommandCenter = {
	run: (command: Command, parameters: NonNullable<unknown>) => void
	upsert: (command: Command) => Promise<Result<Command, Error>>
	getAll: () => Promise<Result<Record<string, Command>, Error>>
}
export const CommandCenter = dency.create<CommandCenter>('command-center')

export class CommageCommandCenter implements CommandCenter {
	static deps = [StorageManager] as const
	constructor(private storage: StorageManager) { }

	async getAll() {
		const content = await this.storage.readFile()

		return content.andThen(({ commands }) => Ok(commands))
	}

	async upsert(command: Command) {
		const content = await this.storage.readFile()

		const updateResult = content.andThen((value) => {
			value.commands[command.name] = command

			return Ok(value)
		})

		if (!updateResult.ok) {
			return updateResult
		}

		const writeResult = await this.storage.writeFile(updateResult.val)

		if (!writeResult.ok) {
			return writeResult
		}

		return Ok(command)
	}

	async run(command: Command, parameters: NonNullable<unknown>) {
		const template = Handlebars.compile(command.template)

		const script = template(parameters)

		const { stdout } = await execa('ttab', ['-d', '', script])

		sola.log(stdout)
	}
}
