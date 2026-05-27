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

		// Mirror each category as a top-level Skill (parentSkillId = null) so the
		// proof-of-work picker can group children under it.
		const parentSlug = slugify(categoryName);
		const parentSkill = await prisma.skill.upsert({
			where: { slug: parentSlug },
			update: { parentSkillId: null, categoryId: category.id },
			create: { name: categoryName, slug: parentSlug, categoryId: category.id }
		});

		for (const skillName of skillNames) {
			const childSlug = slugify(skillName);
			// Skip when the child slug collides with the parent (e.g. a future
			// taxonomy where a skill shares its category's name).
			if (childSlug === parentSlug) continue;
			await prisma.skill.upsert({
				where: { slug: childSlug },
				update: { parentSkillId: parentSkill.id, categoryId: category.id },
				create: {
					name: skillName,
					slug: childSlug,
					categoryId: category.id,
					parentSkillId: parentSkill.id
				}
			});
		}
	}
	const cats = await prisma.skillCategory.count();
	const skills = await prisma.skill.count();
	const parents = await prisma.skill.count({ where: { parentSkillId: null } });
	console.log(
		`✓ Skills taxonomy: ${cats} categories, ${skills} skills (${parents} top-level, ${skills - parents} sub-skills).`
	);
}

async function seedSettings() {
	await prisma.setting.upsert({
		where: { key: 'COMPANY_SELF_REGISTER' },
		update: {},
		create: { key: 'COMPANY_SELF_REGISTER', value: { enabled: true } }
	});
	console.log('✓ Default Setting row: COMPANY_SELF_REGISTER = { enabled: true }.');

	await prisma.setting.upsert({
		where: { key: 'FREELANCER_CREDIT_SYSTEM' },
		update: {},
		create: {
			key: 'FREELANCER_CREDIT_SYSTEM',
			value: { enabled: false, monthlyAllocation: 3 }
		}
	});
	console.log(
		'✓ Default Setting row: FREELANCER_CREDIT_SYSTEM = { enabled: false, monthlyAllocation: 3 }.'
	);

	await prisma.setting.upsert({
		where: { key: 'FREELANCER_REFERRAL_SYSTEM' },
		update: {},
		create: {
			key: 'FREELANCER_REFERRAL_SYSTEM',
			value: {
				enabled: false,
				maxReferrals: 10,
				creditsPerFirstSubmission: 1,
				creditsPerWin: 2
			}
		}
	});
	console.log(
		'✓ Default Setting row: FREELANCER_REFERRAL_SYSTEM = { enabled: false, maxReferrals: 10, creditsPerFirstSubmission: 1, creditsPerWin: 2 }.'
	);
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
