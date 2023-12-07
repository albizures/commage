import process from 'node:process'
import { dency } from '@vyke/dency'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import pkg from '../package.json'
import { JSONStorageManager, StorageManager } from './storage'
import { CommageConfig, Config } from './config'
import { App, CommageApp } from './app'
import { CommageCommandCenter, CommandCenter } from './command-center'

dency.bindClass(Config, CommageConfig, CommageConfig.deps)
dency.bindClass(StorageManager, JSONStorageManager, JSONStorageManager.deps)
dency.bindClass(StorageManager, JSONStorageManager, JSONStorageManager.deps)
dency.bindClass(App, CommageApp, CommageApp.deps)
dency.bindClass(CommandCenter, CommageCommandCenter, CommageCommandCenter.deps)

const noop = <T>(args: T) => args

function main() {
	const app = dency.use(App)

	yargs(hideBin(process.argv))
		.scriptName('commage')
		.usage('$0 [cmd]')
		.command('run', 'Run a command', noop, () => {
			app.start('run')
		})
		.command('edit', 'Edit a command', noop, () => {
			app.start('edit')
		})
		.command('add', 'Add a command', noop, () => {
			app.start('add')
		})
		.version(pkg.version)
		.help()
		.parse()
}

main()
