import * as p from '@clack/prompts'
import color from 'picocolors'
import { dency } from '@vyke/dency'
import { type Result, r } from '@vyke/results'
import { Config } from './config'
import { StorageManager } from './storage'
import { type Command, type Parameter, extraParameters } from './command'
import type { Action } from './args'
import { rootSola } from './sola'
import { CommandCenter } from './command-center'

const sola = rootSola.withTag('app')

export type App = {
	start: (action: Action) => void
}

export const App = dency.create<App>('app')

export class CommageApp implements App {
	static deps = [Config, StorageManager, CommandCenter] as const
	constructor(
		private config: Config,
		private storage: StorageManager,
		private commandCenter: CommandCenter,
	) { }

	async start(action: Action) {
		if (action === 'run') {
			this.runCommand()
		}

		if (action === 'add') {
			return this.addCommand()
		}

		if (action === 'edit') {
			return sola.log('action edit')
		}
	}

	async runCommand() {
		p.intro(`${color.bgCyan(color.black(' running a command '))}`)

		const result = await this.commandCenter.getAll()

		if (!result.ok) {
			return sola.error(result.value)
		}

		const commands = result.value

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
			options,
		})

		const command = commands[commandName as string]!

		const parameters = r.unwrap(await this.askForParameters(command))

		this.commandCenter.run(command, parameters)
	}

	async askForParameters(command: Command): Promise<Result<Record<string, unknown>, Error>> {
		const parameterEntries: Array<Array<string>> = []
		for (const parameter of command.parameters) {
			const { name, defaultValue } = parameter

			const result = await r.to(p.text({
				message: `Value for ${name}`,
				placeholder: defaultValue ? `Enter to use ${defaultValue}` : 'Enter the value',
				defaultValue,
			}))

			if (!result.ok) {
				p.log.error(`Unable to get default value for ${name}`)
				return r.err(new Error(`Error while getting default value ${name}`))
			}

			parameterEntries.push([
				name,
				String(result.value),
			])
		}

		return r.ok(Object.fromEntries(parameterEntries) as Record<string, unknown>)
	}

	async addCommand() {
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
			async parameters(context) {
				const { results } = context

				if (results.template) {
					const parameters = r.expect(extraParameters(results.template), 'Unabled to extra parameters from command')
					const parametersWithDefaultValue: Array<Parameter> = []
					for (const parameter of parameters) {
						const result = await p.text({
							message: `Add a default value for "${parameter.name}"`,
							placeholder: 'Enter to skip',
						})

						const defaultValue = String(result ?? '').trim()

						if (defaultValue === '') {
							parametersWithDefaultValue.push(parameter)
						}
						else {
							parametersWithDefaultValue.push({
								...parameter,
								defaultValue,
							})
						}
					}

					return parametersWithDefaultValue
				}

				return []
			},
		})

		sola.debug('command to create', newCommand)

		const result = await this.commandCenter.upsert(newCommand)

		sola.debug('result of creation', result)

		if (result.ok) {
			return p.log.success('Command created!')
		}

		p.log.error('Error while creating command')
		sola.error(result.value)
	}
}
