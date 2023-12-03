import { dency } from '@vyke/dency'
import { JSONStorageManager, StorageManager } from './storage'
import { CommageConfig, Config } from './config'
import { App, CommageApp } from './app'
import { CommageCommandCenter, CommandCenter } from './commandCenter'

dency.bindClass(Config, CommageConfig, CommageConfig.deps)
dency.bindClass(StorageManager, JSONStorageManager, JSONStorageManager.deps)
dency.bindClass(StorageManager, JSONStorageManager, JSONStorageManager.deps)
dency.bindClass(App, CommageApp, CommageApp.deps)
dency.bindClass(CommandCenter, CommageCommandCenter, CommageCommandCenter.deps)

function main() {
	const app = dency.use(App)

	app.start()
}

main()
