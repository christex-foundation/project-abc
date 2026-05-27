import 'dotenv/config';
import { BountyStatus, BountyType, CompensationType, SubmissionStatus } from '@prisma/client';
import { prisma } from '../src/lib/server/db';

// Amounts in minor units (SLE × 100)
const SLE = 100;

function future(days: number) {
	return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
function past(days: number) {
	return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function ensureCompanyProfile() {
	const user = await prisma.user.findUniqueOrThrow({ where: { email: 'company@fow.sl' } });
	return prisma.companyProfile.upsert({
		where: { userId: user.id },
		update: {},
		create: {
			userId: user.id,
			companyName: 'Christex Foundation',
			description: 'A technology foundation advancing digital skills and entrepreneurship in Sierra Leone.',
			industry: 'Technology / Non-profit',
			country: 'SL',
			website: 'https://christexfoundation.org',
		},
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
			bio: 'Based in Freetown. Experienced in TypeScript, mobile integrations, and community tech.',
			experienceLevel: 'intermediate',
		},
	});
}

async function resolveSkills(slugs: string[]) {
	const skills = await prisma.skill.findMany({ where: { slug: { in: slugs } } });
	return skills.map((s) => s.id);
}

async function seedBounties(companyProfileId: string, freelancerProfileId: string) {
	// --- Bounty 1: Mobile Money Integration Guide (ACTIVE, FIXED, 3 winners) ---
	const b1Skills = await resolveSkills(['mobile-money-integration', 'api-integration']);
	const b1 = await prisma.bounty.upsert({
		where: { slug: 'mobile-money-integration-guide-2026' },
		update: {},
		create: {
			companyProfileId,
			title: 'Mobile Money Integration Guide for SL Developers',
			slug: 'mobile-money-integration-guide-2026',
			type: BountyType.BOUNTY,
			status: BountyStatus.ACTIVE,
			compensationType: CompensationType.FIXED,
			currency: 'SLE',
			totalPrizePool: 5_000_000 * SLE,
			numberOfWinners: 3,
			maxBonusSpots: 0,
			submissionDeadline: future(30),
			judgingDeadline: future(45),
			publishedAt: past(5),
			description:
				'<p>We need a comprehensive developer guide covering how to integrate with Sierra Leone\'s top mobile money APIs — Orange Money, Afrimoney, and Monime. The guide should be practical, include working code samples, and be accessible to intermediate developers.</p>',
			requirements:
				'<ul><li>Cover at least 2 of the 3 major SL mobile money providers</li><li>Include working code samples in JavaScript/TypeScript or Python</li><li>Cover authentication, transfers, and webhook handling</li><li>Published publicly (GitHub, Dev.to, personal blog, etc.)</li></ul>',
			deliverables:
				'<ul><li>Written guide (min 2,000 words)</li><li>GitHub repo with runnable examples</li><li>README with setup instructions</li></ul>',
			prizeTiers: {
				create: [
					{ position: 1, amount: 3_000_000 * SLE, label: '1st Place' },
					{ position: 2, amount: 1_200_000 * SLE, label: '2nd Place' },
					{ position: 3, amount: 800_000 * SLE, label: '3rd Place' },
				],
			},
			skills: {
				create: b1Skills.map((id) => ({ skillId: id, isRequired: false })),
			},
		},
	});
	console.log(`✓ Bounty: ${b1.title}`);

	// --- Bounty 2: NGO Field Research Report (ACTIVE, FIXED, 1 winner) ---
	const b2Skills = await resolveSkills(['field-research', 'ngo-development-reporting']);
	const b2 = await prisma.bounty.upsert({
		where: { slug: 'youth-digital-access-research-2026' },
		update: {},
		create: {
			companyProfileId,
			title: 'Youth Digital Access Field Research Report — Western Area',
			slug: 'youth-digital-access-research-2026',
			type: BountyType.BOUNTY,
			status: BountyStatus.ACTIVE,
			compensationType: CompensationType.FIXED,
			currency: 'SLE',
			totalPrizePool: 2_000_000 * SLE,
			numberOfWinners: 1,
			maxBonusSpots: 0,
			submissionDeadline: future(21),
			judgingDeadline: future(35),
			publishedAt: past(3),
			description:
				'<p>We are commissioning a field research report on digital access barriers facing youth (18–30) in Freetown\'s Western Area. The findings will inform our 2026 digital inclusion program design.</p>',
			requirements:
				'<ul><li>Primary research: minimum 20 interviews or a structured survey with 50+ respondents</li><li>Cover access to devices, internet costs, digital literacy, and platform usage</li><li>Disaggregate data by gender and urban/peri-urban location</li></ul>',
			deliverables:
				'<ul><li>PDF report (10–20 pages, excluding appendices)</li><li>Raw data in Excel or Google Sheets</li><li>Executive summary (1 page)</li></ul>',
			prizeTiers: {
				create: [{ position: 1, amount: 2_000_000 * SLE, label: 'Winner' }],
			},
			skills: {
				create: b2Skills.map((id) => ({ skillId: id, isRequired: false })),
			},
		},
	});
	console.log(`✓ Bounty: ${b2.title}`);

	// --- Bounty 3: Community App UI Design (PROJECT, ACTIVE, 1 winner) ---
	const b3Skills = await resolveSkills(['ui-design', 'figma']);
	const b3 = await prisma.bounty.upsert({
		where: { slug: 'community-skills-app-ui-design-2026' },
		update: {},
		create: {
			companyProfileId,
			title: 'Community Skills Marketplace — Mobile UI Design',
			slug: 'community-skills-app-ui-design-2026',
			type: BountyType.PROJECT,
			status: BountyStatus.ACTIVE,
			compensationType: CompensationType.FIXED,
			currency: 'SLE',
			totalPrizePool: 3_500_000 * SLE,
			numberOfWinners: 1,
			maxBonusSpots: 0,
			timeToComplete: '3 weeks',
			submissionDeadline: future(25),
			judgingDeadline: future(35),
			publishedAt: past(2),
			description:
				'<p>Design the mobile UI for a community skills marketplace app targeting youth in Sierra Leone. The app connects local service providers (tailors, electricians, plumbers, tutors) with customers in their neighbourhood.</p>',
			requirements:
				'<ul><li>Android-first design (mobile-only, no desktop breakpoint required)</li><li>Figma source file with components and auto-layout</li><li>Cover: onboarding, home/discover, provider profile, booking flow, and chat screen</li><li>Design should feel local — avoid generic Western app aesthetics</li></ul>',
			deliverables:
				'<ul><li>Figma file (shared link, view access)</li><li>Exported PNG previews of all key screens</li><li>Short loom/video walkthrough (optional but preferred)</li></ul>',
			prizeTiers: {
				create: [{ position: 1, amount: 3_500_000 * SLE, label: 'Selected Designer' }],
			},
			skills: {
				create: b3Skills.map((id) => ({ skillId: id, isRequired: true })),
			},
		},
	});
	console.log(`✓ Bounty: ${b3.title}`);

	// --- Bounty 4: WhatsApp Bot Development (BOUNTY, JUDGING, RANGE) ---
	const b4Skills = await resolveSkills(['whatsapp-bots', 'api-integration', 'node-js']);
	const b4 = await prisma.bounty.upsert({
		where: { slug: 'whatsapp-job-alert-bot-2026' },
		update: {},
		create: {
			companyProfileId,
			title: 'WhatsApp Job Alert Bot for SL Youth',
			slug: 'whatsapp-job-alert-bot-2026',
			type: BountyType.BOUNTY,
			status: BountyStatus.JUDGING,
			compensationType: CompensationType.RANGE,
			currency: 'SLE',
			totalPrizePool: 6_000_000 * SLE,
			numberOfWinners: 1,
			maxBonusSpots: 0,
			minRewardAsk: 4_000_000 * SLE,
			maxRewardAsk: 8_000_000 * SLE,
			submissionDeadline: past(7),
			judgingDeadline: future(7),
			publishedAt: past(30),
			description:
				'<p>Build a WhatsApp bot that sends daily or weekly job alerts to registered youth. Users can subscribe via a keyword, set their skill category preferences, and receive formatted alerts with application links. Powered by the WhatsApp Business API or a gateway like Twilio.</p>',
			requirements:
				'<ul><li>Working WhatsApp bot (demo number or sandbox acceptable)</li><li>Subscribe/unsubscribe flow</li><li>Category filter (at least 3 job categories)</li><li>Source code on GitHub</li><li>Deployed and accessible for judging</li></ul>',
			deliverables:
				'<ul><li>GitHub repo (public or shared)</li><li>Deployed bot (link or QR code to start chat)</li><li>Short demo video (2–5 min)</li></ul>',
			prizeTiers: {
				create: [{ position: 1, amount: 6_000_000 * SLE, label: 'Winner' }],
			},
			skills: {
				create: b4Skills.map((id) => ({ skillId: id, isRequired: false })),
			},
		},
	});
	console.log(`✓ Bounty: ${b4.title}`);

	// --- Bounty 5: Local Content Creation (BOUNTY, COMPLETED, 2 winners + 1 bonus) ---
	const b5Skills = await resolveSkills(['local-content-creation', 'community-management']);
	const b5 = await prisma.bounty.upsert({
		where: { slug: 'krio-tech-content-challenge-2025' },
		update: {},
		create: {
			companyProfileId,
			title: 'Krio-Language Tech Explainer Content Challenge',
			slug: 'krio-tech-content-challenge-2025',
			type: BountyType.BOUNTY,
			status: BountyStatus.COMPLETED,
			compensationType: CompensationType.FIXED,
			currency: 'SLE',
			totalPrizePool: 1_500_000 * SLE,
			numberOfWinners: 2,
			maxBonusSpots: 1,
			submissionDeadline: past(45),
			judgingDeadline: past(30),
			publishedAt: past(75),
			completedAt: past(28),
			isWinnersAnnounced: true,
			winnersAnnouncedAt: past(28),
			prizeTiers: {
				create: [
					{ position: 1, amount: 700_000 * SLE, label: '1st Place' },
					{ position: 2, amount: 500_000 * SLE, label: '2nd Place' },
					{ position: 99, amount: 300_000 * SLE, label: 'Bonus Prize' },
				],
			},
			description:
				'<p>Create short explainer content (video, illustrated post, or thread) that teaches a tech concept in Krio — Sierra Leone\'s lingua franca. Topics: what is the internet, how mobile money works, or how to stay safe online.</p>',
			requirements:
				'<ul><li>Content must be primarily in Krio</li><li>Published on a public platform (TikTok, Facebook, Instagram, YouTube, or Twitter/X)</li><li>Minimum 500 views within the submission window</li></ul>',
			deliverables: '<ul><li>Public post/video link</li><li>Screenshot of view count at submission time</li></ul>',
			skills: {
				create: b5Skills.map((id) => ({ skillId: id, isRequired: false })),
			},
		},
	});
	console.log(`✓ Bounty: ${b5.title}`);

	// --- Submission on bounty 4 (JUDGING) from the test freelancer ---
	const existingSubmission = await prisma.submission.findUnique({
		where: { bountyId_freelancerProfileId: { bountyId: b4.id, freelancerProfileId } },
	});
	if (!existingSubmission) {
		await prisma.submission.create({
			data: {
				bountyId: b4.id,
				freelancerProfileId,
				link: 'https://github.com/test-freelancer/wa-job-alert-bot',
				otherInfo:
					'<p>Built with Node.js + Twilio WhatsApp Sandbox. Deployed on Railway. Supports 5 job categories and sends alerts daily at 9am SL time. Demo QR code in the README.</p>',
				status: SubmissionStatus.PENDING,
				ask: 5_500_000 * SLE,
			},
		});
		console.log('✓ Submission: freelancer → WhatsApp Bot bounty');
	} else {
		console.log('✓ Submission already exists — skipped');
	}
}

async function main() {
	console.log('Seeding dev bounties…\n');
	const company = await ensureCompanyProfile();
	console.log(`✓ CompanyProfile: ${company.companyName}`);
	const freelancer = await ensureFreelancerProfile();
	console.log(`✓ FreelancerProfile: ${freelancer.displayName}\n`);

	await seedBounties(company.id, freelancer.id);

	console.log('\n--- Dev bounties summary ---');
	console.log('ACTIVE   Mobile Money Integration Guide');
	console.log('ACTIVE   Youth Digital Access Research Report');
	console.log('ACTIVE   Community Skills Marketplace UI Design');
	console.log('JUDGING  WhatsApp Job Alert Bot (+ 1 submission from freelancer@fow.sl)');
	console.log('DONE     Krio Tech Content Challenge (completed, winners announced)');

	await prisma.$disconnect();
}

main().catch(async (e) => {
	console.error(e);
	await prisma.$disconnect();
	process.exit(1);
});
