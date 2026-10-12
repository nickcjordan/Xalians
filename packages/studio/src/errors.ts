/** A refusal the CLI prints as a one-line reason and exits 1 on. */
export class StudioError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'StudioError';
	}
}
