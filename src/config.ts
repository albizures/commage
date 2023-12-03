import { homedir } from 'node:os'
import { dency } from '@vyke/dency'

type Files = {
	commands: string
}

type FileType = keyof Files

export type Config = {
	files: Files

	updatePathFile: (type: FileType, pathFile: string) => void
}

export const Config = dency.create<Config>('config')

export class CommageConfig implements Config {
	static deps = [] as const
	files: Files

	constructor() {
		this.files = {
			commands: `${homedir()}/.config/commage/commands.json`,
		}
	}

	updatePathFile(_type: 'commands', _pathFile: string) {

	}
}
