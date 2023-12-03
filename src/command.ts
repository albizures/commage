import Handlebars from 'handlebars'
import { Err, Ok, type Result } from 'ts-results'
import { z } from 'zod'

export const parameterSchema = z.object({
	name: z.string(),
	defaultValue: z.string().optional(),
})

export const commandSchema = z.object({
	name: z.string(),
	template: z.string(),
	parameters: z.array(parameterSchema),
})

export type Parameter = z.infer<typeof parameterSchema>
export type Command = z.infer<typeof commandSchema>

export function extraParameters(command: string): Result<Array<Parameter>, Error> {
	const parameters: Array<Parameter> = []

	try {
		const template = Handlebars.compile(command)

		const proxy = new Proxy({}, {
			get(target, p) {
				parameters.push({
					name: String(p),
				})

				return p
			},
		})

		template(proxy, {
			allowProtoPropertiesByDefault: true,
		})

		return Ok(parameters)
	}
	catch (error) {
		return Err(new Error(String(error)))
	}
}
