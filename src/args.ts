import { z } from 'zod'

const argsSchema = z.tuple([
	z.union([
		z.literal('run'),
		z.literal('add'),
		z.literal('edit'),
	]),
])

export type Action = z.infer<typeof argsSchema>[0]
