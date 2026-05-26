import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { prisma } from './db';
import { sendEmail } from './email/send';
// The Better Auth `admin` plugin (ban/impersonate/list users) is deferred to
// Phase 7 alongside the /admin/users UI — see the Phase 1 plan. Re-enabling
// it will require a Prisma migration adding its `banned`, `banReason`,
// `banExpires` columns and reconciling its string-typed `role` field.

const isProd = process.env.NODE_ENV === 'production';

const trustedOrigins = [
	'https://fow.sl',
	'https://admin.fow.sl',
	'http://localhost:5173',
	'http://admin.localhost:5173'
];

export const auth = betterAuth({
	database: prismaAdapter(prisma, { provider: 'postgresql' }),
	secret: process.env.BETTER_AUTH_SECRET,
	baseURL: process.env.BETTER_AUTH_URL,
	trustedOrigins,

	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		minPasswordLength: 8,
		sendResetPassword: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				template: 'reset-password',
				props: { name: user.name ?? user.email, url }
			});
		}
	},

	emailVerification: {
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		sendVerificationEmail: async ({ user, url }) => {
			await sendEmail({
				to: user.email,
				template: 'verify-email',
				props: { name: user.name ?? user.email, url }
			});
		}
	},

	socialProviders: {
		google:
			process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
				? {
						clientId: process.env.GOOGLE_CLIENT_ID,
						clientSecret: process.env.GOOGLE_CLIENT_SECRET
					}
				: undefined
	},

	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: false,
				defaultValue: 'FREELANCER',
				// Services patch role server-side. The public signup endpoint must
				// never be able to set it directly (plan §4 / CLAUDE.md).
				input: false
			},
			phoneNumber: { type: 'string', required: false, input: true },
			isActive: { type: 'boolean', required: false, defaultValue: true, input: false }
		}
	},

	advanced: {
		cookies: {
			sessionToken: {
				attributes: {
					// `domain` is intentionally omitted — host-only cookie so admin.fow.sl
					// sessions stay isolated from fow.sl (plan §5).
					httpOnly: true,
					sameSite: 'lax',
					secure: isProd,
					path: '/'
				}
			}
		}
	},

	plugins: [],

	hooks: {
		// Enforces the FOW password policy (plan §4: >=8 chars, ≥1 digit) at the
		// Better Auth boundary, so direct POSTs to /api/auth/sign-up/email or the
		// password-reset endpoint can't bypass the Zod schemas in our services.
		before: createAuthMiddleware(async (ctx) => {
			const password = passwordFromBody(ctx.body);
			if (!password) return;
			const path = ctx.path ?? '';
			if (!PASSWORD_PATHS.some((p) => path.endsWith(p))) return;
			if (password.length < 8 || !/\d/.test(password)) {
				throw new APIError('BAD_REQUEST', {
					message: 'Password must be at least 8 characters and contain a digit.'
				});
			}
		})
	}
});

const PASSWORD_PATHS = ['/sign-up/email', '/reset-password'];

function passwordFromBody(body: unknown): string | null {
	if (!body || typeof body !== 'object') return null;
	const candidate =
		(body as Record<string, unknown>).password ?? (body as Record<string, unknown>).newPassword;
	return typeof candidate === 'string' ? candidate : null;
}

export type Auth = typeof auth;
