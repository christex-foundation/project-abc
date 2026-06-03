import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function createClient(): PrismaClient {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error('DATABASE_URL is required.');
	}
	// Explicit pool size: the default pg.Pool max of 10 is tight for the
	// dashboard's concurrent Promise.all fan-out plus the layout load. 20 is
	// safe against the Neon pooler (pgbouncer transaction mode multiplexes).
	const adapter = new PrismaPg({ connectionString: url, max: 20 });
	return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.__prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.__prisma = prisma;
}
