import Handlebars from 'handlebars'
import { dency } from '@vyke/dency'
import { type Result, r } from '@vyke/results'
import { execa } from 'execa'
import type { Command } from './command'
import { type StorageContent, StorageManager } from './storage'
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
		return this.storage.readFile()
			.then(r.next(getCommands))
	}

	async upsert(command: Command) {
		const content = await this.storage.readFile()
			.then(r.next(addCommand(command)))
			.then(r.next((result) => this.storage.writeFile(result)))

		if (!content.ok) {
			return content
		}

		return r.ok(command)
	}

	async run(command: Command, parameters: NonNullable<unknown>) {
		const template = Handlebars.compile(command.template)

		const script = template(parameters)

		const { stdout } = await execa('ttab', ['-d', '', script])

		sola.log(stdout)
	}
}

// #region helpers
function addCommand(command: Command) {
	return (value: StorageContent) => {
		value.commands[command.name] = command

		return r.ok(value)
	}
}

function getCommands(value: StorageContent) {
	return r.ok(value.commands)
}
// #endregion
