import 'dotenv/config';
import { ProjectStatus, ProposalStatus } from '@prisma/client';
import { prisma } from '../src/lib/server/db';

// Amounts in minor units (SLE × 100)
const SLE = 100;

async function ensureCompanyProfile() {
	const user = await prisma.user.findUniqueOrThrow({ where: { email: 'company@fow.sl' } });
	return prisma.companyProfile.upsert({
		where: { userId: user.id },
		update: {},
		create: {
			userId: user.id,
			companyName: 'Christex Foundation',
			description: 'A technology foundation advancing digital skills in Sierra Leone.',
			industry: 'Technology / Non-profit',
			country: 'SL',
			website: 'https://christexfoundation.org'
		}
	});
}

async function ensureFreelancerProfile() {
	const user = await prisma.user.findUniqueOrThrow({ where: { email: 'freelancer@fow.sl' } });
	return prisma.freelancerProfile.upsert({
		where: { userId: user.id },
		update: {},
		create: {
			userId: user.id,
			displayName: 'Test Freelancer',
			headline: 'Full-stack developer & mobile money specialist',
			bio: 'Based in Freetown. TypeScript, mobile integrations, community tech.',
			experienceLevel: 'intermediate'
		}
	});
}

async function resolveSkills(slugs: string[]) {
	const skills = await prisma.skill.findMany({ where: { slug: { in: slugs } } });
	return skills.map((s) => s.id);
}

async function seedProjects(companyProfileId: string, freelancerProfileId: string) {
	// --- Project 1: OPEN, accepting proposals, with one submitted proposal ---
	const skills = await resolveSkills(['api-integration', 'mobile-money-integration']);
	const existing = await prisma.project.findUnique({
		where: { slug: 'booking-api-for-tourism-site' },
		select: { id: true }
	});
	if (existing) {
		console.log('Project "booking-api-for-tourism-site" already seeded — skipping.');
		return;
	}

	// Company-defined milestone plan (sum = budget).
	const milestones = [
		{
			position: 1,
			title: 'Auth + availability endpoints',
			description: '<p>JWT auth and availability search.</p>',
			amount: 2000 * SLE,
			dueInDays: 10
		},
		{
			position: 2,
			title: 'Booking + Monime payment flow',
			description: '<p>Create bookings, integrate Monime checkout.</p>',
			amount: 2500 * SLE,
			dueInDays: 14
		},
		{ position: 3, title: 'Docs, tests & handover', amount: 1000 * SLE, dueInDays: 7 }
	];
	const total = milestones.reduce((s, m) => s + m.amount, 0);

	const project = await prisma.project.create({
		data: {
			companyProfileId,
			title: 'Build a Booking REST API for our Tourism Site',
			slug: 'booking-api-for-tourism-site',
			description:
				'<p>We need a REST API powering availability, bookings, and mobile-money payments for a Sierra Leone tourism booking platform. Node/TypeScript preferred.</p>',
			requirements:
				'<p>Postman collection, automated tests, and deploy notes. Must integrate Monime for payments.</p>',
			deliverables: '<p>Documented, tested endpoints handed over via GitHub.</p>',
			status: ProjectStatus.OPEN,
			currency: 'SLE',
			budgetCap: total,
			timeToComplete: '6 weeks',
			publishedAt: new Date(),
			skills: { create: skills.map((skillId, i) => ({ skillId, isRequired: i === 0 })) },
			milestones: { create: milestones }
		},
		select: { id: true }
	});

	// One submitted proposal (cover letter only) so the company can award.
	await prisma.projectProposal.create({
		data: {
			projectId: project.id,
			freelancerProfileId,
			freelancerNameSnapshot: 'Test Freelancer',
			coverLetter:
				'<p>I have shipped three booking systems with mobile-money integration. I can deliver this plan in five weeks.</p>',
			proposedTimeline: '5 weeks',
			status: ProposalStatus.SUBMITTED
		}
	});

	console.log('Seeded OPEN project (company milestones) + 1 submitted proposal.');
}

async function main() {
	const company = await ensureCompanyProfile();
	const freelancer = await ensureFreelancerProfile();
	await seedProjects(company.id, freelancer.id);

	console.log('\n--- Dev projects summary ---');
	console.log(
		'OPEN  Build a Booking REST API for our Tourism Site (1 proposal from freelancer@fow.sl)'
	);
	console.log('Flow: award the proposal → fund escrow → open workspace → milestone loop.');

	await prisma.$disconnect();
}

main().catch(async (e) => {
	console.error(e);
	await prisma.$disconnect();
	process.exit(1);
});
