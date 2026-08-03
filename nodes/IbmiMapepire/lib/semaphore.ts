export class PoolWaitTimeoutError extends Error {
	constructor(timeoutMs: number) {
		super(`No Mapepire pool slot became available within ${timeoutMs} ms`);
		this.name = 'PoolWaitTimeoutError';
	}
}

interface Waiter {
	resolve: (release: () => void) => void;
	reject: (error: Error) => void;
	timer: ReturnType<typeof setTimeout>;
}

export class Semaphore {
	private active = 0;
	private readonly queue: Waiter[] = [];

	constructor(private readonly limit: number) {
		if (!Number.isInteger(limit) || limit < 1) throw new Error('Semaphore limit must be positive');
	}

	async acquire(timeoutMs: number): Promise<() => void> {
		if (this.active < this.limit) {
			this.active += 1;
			return this.createRelease();
		}

		return await new Promise<() => void>((resolve, reject) => {
			const waiter: Waiter = {
				resolve,
				reject,
				timer: setTimeout(() => {
					const index = this.queue.indexOf(waiter);
					if (index >= 0) this.queue.splice(index, 1);
					reject(new PoolWaitTimeoutError(timeoutMs));
				}, timeoutMs),
			};
			this.queue.push(waiter);
		});
	}

	private createRelease(): () => void {
		let released = false;
		return () => {
			if (released) return;
			released = true;
			const waiter = this.queue.shift();
			if (waiter) {
				clearTimeout(waiter.timer);
				waiter.resolve(this.createRelease());
				return;
			}
			this.active -= 1;
		};
	}

	getActiveCount(): number {
		return this.active;
	}

	getWaitingCount(): number {
		return this.queue.length;
	}
}
