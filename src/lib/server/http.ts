import { json } from '@sveltejs/kit';

export type AppErrorCode =
	| 'UNAUTHENTICATED'
	| 'FORBIDDEN'
	| 'NOT_FOUND'
	| 'BAD_REQUEST'
	| 'CONFLICT'
	| 'RATE_LIMITED'
	| 'INTERNAL';

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
	UNAUTHENTICATED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	BAD_REQUEST: 400,
	CONFLICT: 409,
	RATE_LIMITED: 429,
	INTERNAL: 500
};

export class AppError extends Error {
	code: AppErrorCode;
	httpStatus: number;
	details?: unknown;

	constructor(code: AppErrorCode, message: string, details?: unknown) {
		super(message);
		this.code = code;
		this.httpStatus = STATUS_BY_CODE[code];
		this.details = details;
	}
}

export function respondError(e: unknown): Response {
	if (e instanceof AppError) {
		return json(
			{ error: { code: e.code, message: e.message, details: e.details } },
			{ status: e.httpStatus }
		);
	}
	console.error('[respondError] unexpected error:', e);
	return json({ error: { code: 'INTERNAL', message: 'Internal server error' } }, { status: 500 });
}
