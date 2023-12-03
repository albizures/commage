import { z } from 'zod'
import { Err, Ok, type Result } from 'ts-results'

const argsSchema = z.tuple([
	z.union([
		z.literal('run'),
		z.literal('add'),
		z.literal('edit'),
	]),
])

type Action = z.infer<typeof argsSchema>[0]

type Args = {
	action: Action
}

export function getArgs(): Result<Args, Error> {
	const args = argsSchema.safeParse(process.argv.slice(2))

	if (args.success) {
		return Ok({
			action: args.data[0],
		})
	}

	return Err(new Error('invalid args'))
}
