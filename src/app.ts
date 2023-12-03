import * as p from '@clack/prompts'
import color from 'picocolors'
import { dency } from '@vyke/dency'
import { Err, Ok, type Result } from 'ts-results'
import { to } from 'only-fns/promises/await-to'
import { Config } from './config'
import { StorageManager } from './storage'
import { type Command, extraParameters } from './command'
import { getArgs } from './args'
import { rootSola } from './sola'
import { CommandCenter } from './commandCenter'

const sola = rootSola.withTag('app')

export type App = {
	start: () => void
}

export const App = dency.create<App>('app')

export class CommageApp implements App {
	static deps = [Config, StorageManager, CommandCenter] as const
	constructor(
		private config: Config,
		private storage: StorageManager,
		private commandCenter: CommandCenter,
	) { }

	async start() {
		const args = getArgs()

		if (args.err) {
			return sola.error(args.val.message)
		}

		const { action } = args.val

		if (action === 'run') {
			this.runCommand()
		}

		if (action === 'add') {
			return this.addCommand()
		}

		if (action === 'edit') {
			return sola.log('action run')
		}
	}

	async runCommand() {
		p.intro(`${color.bgCyan(color.black(' running a command '))}`)

		const result = await this.commandCenter.getAll()

		if (!result.ok) {
			return sola.error(result.val)
		}

		const commands = result.val

		const options = Object.values(commands).map((command) => {
			return {
				value: command.name,
			}
		})

		if (options.length === 0) {
			return p.log.error('Not commands found')
		}

		const commandName = await p.select<Array<{ value: string }>, string>({
			message: 'Choose the command to run',
			options: Object.values(commands).map((command) => {
				return {
					value: command.name,
				}
			}),
		})

		const command = commands[commandName as string]!

		const parameters = (await this.askForParameters(command)).unwrap()

		this.commandCenter.run(command, parameters)
	}

	async askForParameters(command: Command): Promise<Result<Record<string, unknown>, Error>> {
		const parameterEntries = await to(Promise.all(
			command.parameters.map(async (parameter) => {
				const { name, defaultValue } = parameter

				return [
					name,
					String(await p.text({
						message: `Value for ${name}`,
						placeholder: defaultValue ? `Enter to use ${defaultValue}` : 'Enter the value',
						defaultValue,
					})),
				]
			}),
		))

		if (!parameterEntries.ok) {
			sola.error(parameterEntries.error)
			return Err(new Error('getting the parameters'))
		}

		return Ok(Object.fromEntries(parameterEntries.data) as Record<string, unknown>)
	}

	async addCommand() {
		sola.log('action run')

		p.intro(`${color.bgCyan(color.black(' adding a new command '))}`)

		const newCommand = await p.group<Command>({
			name() {
				return p.text({
					message: 'What\'s the name of the command?',
					placeholder: 'name',
					validate: (value) => {
						if (!value) {
							return 'Please enter a name.'
						}
					},
				}) as Promise<string>
			},
			template() {
				return p.text({
					message: 'What\'s the command to save?',
					placeholder: 'command',
					validate: (value) => {
						if (!value) {
							return 'Please enter a command'
						}
					},
				}) as Promise<string>
			},
			parameters(context) {
				const { results } = context

				if (results.template) {
					const parameters = extraParameters(results.template).expect('Unabled to extra parameters from command')

					return Promise.all(
						parameters.map(async (parameter) => {
							const result = await p.text({
								message: `Add a default value for "${parameter.name}"`,
								placeholder: 'Enter to skip',
							})

							const defaultValue = String(result ?? '').trim()

							if (defaultValue === '') {
								return parameter
							}

							return {
								...parameter,
								defaultValue,
							}
						}),
					)
				}

				return Promise.resolve([])
			},
		})

		sola.debug('command to create', newCommand)

		const result = await this.commandCenter.upsert(newCommand)

		sola.debug('result of creation', result)

		if (result.ok) {
			return p.log.success('Command created!')
		}

		p.log.error('Error while creating command')
		sola.error(result.val)
	}
}
