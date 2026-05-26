// Seed runs against the database referenced by DATABASE_URL.
// Idempotent — re-runnable in any environment.
//
// Produces:
//   - Skills taxonomy (categories + SL-relevant skills).
//   - Default Setting row: COMPANY_SELF_REGISTER = { enabled: true }.
//   - Admin user (env ADMIN_EMAIL). Throwaway password printed to stdout for
//     first sign-in via /forgot-password.

import 'dotenv/config';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { authCli } from '../src/lib/server/auth-cli';
import { prisma } from '../src/lib/server/db';

const SKILL_TAXONOMY: Record<string, string[]> = {
	Development: [
		'TypeScript',
		'JavaScript',
		'Python',
		'Go',
		'Rust',
		'React',
		'Svelte',
		'Next.js',
		'SvelteKit',
		'Node.js',
		'PostgreSQL',
		'API Integration',
		'Smart Contracts',
		'Mobile App Development'
	],
	Design: ['UI Design', 'UX Design', 'Figma', 'Logo Design', 'Brand Identity', 'Illustration'],
	Writing: ['Technical Writing', 'Copywriting', 'Content Marketing', 'Editing', 'Translation'],
	Marketing: ['SEO', 'Social Media Marketing', 'Email Marketing', 'Growth Marketing'],
	Data: ['Data Analysis', 'SQL', 'Data Entry', 'Data Visualization'],
	Video: ['Video Editing', 'Motion Graphics', 'Animation'],
	Community: ['Community Management', 'Discord Moderation', 'Local Content Creation'],
	'Mobile & Telecom': [
		'Mobile Money Integration',
		'USSD Development',
		'SMS Gateway',
		'WhatsApp Bots'
	],
	'Research & Consulting': [
		'Field Research',
		'NGO/Development Reporting',
		'Market Research',
		'Policy Analysis'
	]
};

function slugify(s: string) {
	return s
		.toLowerCase()
		.replace(/&/g, 'and')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

async function seedSkills() {
	for (const [categoryName, skillNames] of Object.entries(SKILL_TAXONOMY)) {
		const category = await prisma.skillCategory.upsert({
			where: { slug: slugify(categoryName) },
			update: {},
			create: { name: categoryName, slug: slugify(categoryName) }
		});
		for (const skillName of skillNames) {
			await prisma.skill.upsert({
				where: { slug: slugify(skillName) },
				update: {},
				create: { name: skillName, slug: slugify(skillName), categoryId: category.id }
			});
		}
	}
	const cats = await prisma.skillCategory.count();
	const skills = await prisma.skill.count();
	console.log(`✓ Skills taxonomy: ${cats} categories, ${skills} skills.`);
}

async function seedSettings() {
	await prisma.setting.upsert({
		where: { key: 'COMPANY_SELF_REGISTER' },
		update: {},
		create: { key: 'COMPANY_SELF_REGISTER', value: { enabled: true } }
	});
	console.log('✓ Default Setting row: COMPANY_SELF_REGISTER = { enabled: true }.');
}

async function seedAdmin() {
	const email = process.env.ADMIN_EMAIL;
	if (!email) {
		console.warn('⚠ ADMIN_EMAIL not set — skipping admin user seed.');
		return;
	}

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		// Make sure role + isActive are correct even if a previous run patched them.
		if (existing.role !== UserRole.ADMIN || !existing.isActive) {
			await prisma.user.update({
				where: { id: existing.id },
				data: { role: UserRole.ADMIN, isActive: true, emailVerified: true }
			});
		}
		console.log(`✓ Admin user already exists: ${email}.`);
		return;
	}

	const password = randomBytes(16).toString('hex');
	const result = await authCli.api.signUpEmail({
		body: { email, password, name: 'Platform Admin' }
	});
	if (!result.user?.id) {
		throw new Error(`Failed to create admin user: ${JSON.stringify(result)}`);
	}

	await prisma.user.update({
		where: { id: result.user.id },
		data: { role: UserRole.ADMIN, isActive: true, emailVerified: true }
	});

	console.log('✓ Admin user created.');
	console.log(`  email:    ${email}`);
	console.log(`  password: ${password}`);
	console.log('  Sign in at /login and immediately rotate via /forgot-password.');
}

async function main() {
	await seedSkills();
	await seedSettings();
	await seedAdmin();
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
