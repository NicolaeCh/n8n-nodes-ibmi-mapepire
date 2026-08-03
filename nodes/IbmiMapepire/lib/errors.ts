/**
 * Internal validation/configuration error.
 *
 * Node execution boundaries convert this error to NodeOperationError. Keeping
 * policy helpers independent from n8n execution objects makes them reusable by
 * credential tests and unit tests without throwing raw native Error instances.
 */
export class IbmiMapepireError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = 'IbmiMapepireError';
	}
}

export function normalizeError(error: unknown): Error {
	return error instanceof Error ? error : new IbmiMapepireError(String(error));
}
