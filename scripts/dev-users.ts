import 'dotenv/config';
import { UserRole } from '@prisma/client';
import { hashPassword } from '@better-auth/utils/password';
import { authCli } from '../src/lib/server/auth-cli';
import { prisma } from '../src/lib/server/db';

const DEV_USERS = [
	{ email: 'admin@fow.sl', password: 'Admin1234!', name: 'Platform Admin', role: UserRole.ADMIN },
	{
		email: 'company@fow.sl',
		password: 'Company1234!',
		name: 'Test Company',
		role: UserRole.COMPANY
	},
	{
		email: 'freelancer@fow.sl',
		password: 'Freelancer1234!',
		name: 'Test Freelancer',
		role: UserRole.FREELANCER
	}
];

async function main() {
	for (const u of DEV_USERS) {
		const existing = await prisma.user.findUnique({ where: { email: u.email } });

		if (existing) {
			await prisma.user.update({
				where: { id: existing.id },
				data: { role: u.role, isActive: true, emailVerified: true }
			});
			const hash = await hashPassword(u.password);
			await prisma.account.updateMany({
				where: { userId: existing.id, providerId: 'credential' },
				data: { password: hash }
			});
			console.log(`✓ Updated: ${u.email}`);
		} else {
			const result = await authCli.api.signUpEmail({
				body: { email: u.email, password: u.password, name: u.name }
			});
			if (!result.user?.id) throw new Error(`Failed to create: ${u.email}`);
			await prisma.user.update({
				where: { id: result.user.id },
				data: { role: u.role, isActive: true, emailVerified: true }
			});
			console.log(`✓ Created: ${u.email}`);
		}
	}

	console.log('\n--- Dev credentials ---');
	for (const u of DEV_USERS) {
		console.log(`${u.role.padEnd(12)} ${u.email.padEnd(22)}  password: ${u.password}`);
	}
	await prisma.$disconnect();
}

main().catch(async (e) => {
	console.error(e);
	await prisma.$disconnect();
	process.exit(1);
});
