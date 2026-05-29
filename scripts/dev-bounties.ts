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
			description:
				'A technology foundation advancing digital skills and entrepreneurship in Sierra Leone.',
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
			bio: 'Based in Freetown. Experienced in TypeScript, mobile integrations, and community tech.',
			experienceLevel: 'intermediate'
		}
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
				"<p>We need a comprehensive developer guide covering how to integrate with Sierra Leone's top mobile money APIs — Orange Money, Afrimoney, and Monime. The guide should be practical, include working code samples, and be accessible to intermediate developers.</p>",
			requirements:
				'<ul><li>Cover at least 2 of the 3 major SL mobile money providers</li><li>Include working code samples in JavaScript/TypeScript or Python</li><li>Cover authentication, transfers, and webhook handling</li><li>Published publicly (GitHub, Dev.to, personal blog, etc.)</li></ul>',
			deliverables:
				'<ul><li>Written guide (min 2,000 words)</li><li>GitHub repo with runnable examples</li><li>README with setup instructions</li></ul>',
			prizeTiers: {
				create: [
					{ position: 1, amount: 3_000_000 * SLE, label: '1st Place' },
					{ position: 2, amount: 1_200_000 * SLE, label: '2nd Place' },
					{ position: 3, amount: 800_000 * SLE, label: '3rd Place' }
				]
			},
			skills: {
				create: b1Skills.map((id) => ({ skillId: id, isRequired: false }))
			}
		}
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
				"<p>We are commissioning a field research report on digital access barriers facing youth (18–30) in Freetown's Western Area. The findings will inform our 2026 digital inclusion program design.</p>",
			requirements:
				'<ul><li>Primary research: minimum 20 interviews or a structured survey with 50+ respondents</li><li>Cover access to devices, internet costs, digital literacy, and platform usage</li><li>Disaggregate data by gender and urban/peri-urban location</li></ul>',
			deliverables:
				'<ul><li>PDF report (10–20 pages, excluding appendices)</li><li>Raw data in Excel or Google Sheets</li><li>Executive summary (1 page)</li></ul>',
			prizeTiers: {
				create: [{ position: 1, amount: 2_000_000 * SLE, label: 'Winner' }]
			},
			skills: {
				create: b2Skills.map((id) => ({ skillId: id, isRequired: false }))
			}
		}
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
				create: [{ position: 1, amount: 3_500_000 * SLE, label: 'Selected Designer' }]
			},
			skills: {
				create: b3Skills.map((id) => ({ skillId: id, isRequired: true }))
			}
		}
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
				create: [{ position: 1, amount: 6_000_000 * SLE, label: 'Winner' }]
			},
			skills: {
				create: b4Skills.map((id) => ({ skillId: id, isRequired: false }))
			}
		}
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
					{ position: 99, amount: 300_000 * SLE, label: 'Bonus Prize' }
				]
			},
			description:
				"<p>Create short explainer content (video, illustrated post, or thread) that teaches a tech concept in Krio — Sierra Leone's lingua franca. Topics: what is the internet, how mobile money works, or how to stay safe online.</p>",
			requirements:
				'<ul><li>Content must be primarily in Krio</li><li>Published on a public platform (TikTok, Facebook, Instagram, YouTube, or Twitter/X)</li><li>Minimum 500 views within the submission window</li></ul>',
			deliverables:
				'<ul><li>Public post/video link</li><li>Screenshot of view count at submission time</li></ul>',
			skills: {
				create: b5Skills.map((id) => ({ skillId: id, isRequired: false }))
			}
		}
	});
	console.log(`✓ Bounty: ${b5.title}`);

	// --- Bounty 6: Pharmacy Stock-Out Open Dataset (BOUNTY, ACTIVE, FIXED, 2 winners) ---
	const b6Skills = await resolveSkills(['field-research', 'data-analysis', 'data-entry']);
	const b6 = await prisma.bounty.upsert({
		where: { slug: 'pharmacy-stockout-open-dataset-freetown-2026' },
		update: {},
		create: {
			companyProfileId,
			title: 'Pharmacy Stock-Out Open Dataset — Freetown',
			slug: 'pharmacy-stockout-open-dataset-freetown-2026',
			type: BountyType.BOUNTY,
			status: BountyStatus.ACTIVE,
			compensationType: CompensationType.FIXED,
			currency: 'SLE',
			totalPrizePool: 2_500_000 * SLE,
			numberOfWinners: 2,
			maxBonusSpots: 0,
			submissionDeadline: future(28),
			judgingDeadline: future(42),
			publishedAt: past(2),
			description:
				'<p>We are crowdsourcing a four-week stock-out tracker for essential medicines across pharmacies in Freetown. The resulting open dataset will be shared with the Ministry of Health, civil-society advocates, and journalists working on health access in Sierra Leone.</p>',
			requirements:
				'<ul><li>Cover at least 30 pharmacies across Western Area Urban (Central, East, West) and Western Area Rural</li><li>Track availability of: paracetamol, ORS sachets, malaria RDTs, ACT (artemisinin combination therapy), amoxicillin, hypertension meds (amlodipine/losartan), and metformin</li><li>Visit each pharmacy at least twice during the four-week window and record date + time of each visit</li><li>Open license (CC-BY 4.0) so the data can be reused</li></ul>',
			deliverables:
				'<ul><li>Cleaned CSV with one row per pharmacy-visit-medicine</li><li>Short methodology PDF (3–6 pages) explaining sampling, definitions, and limitations</li><li>Pharmacy locations as a GeoJSON or KML file (no personally identifying info)</li></ul>',
			prizeTiers: {
				create: [
					{ position: 1, amount: 1_500_000 * SLE, label: '1st Place' },
					{ position: 2, amount: 1_000_000 * SLE, label: '2nd Place' }
				]
			},
			skills: {
				create: b6Skills.map((id) => ({ skillId: id, isRequired: false }))
			}
		}
	});
	console.log(`✓ Bounty: ${b6.title}`);

	// --- Bounty 7: Diaspora Remittance Fee Comparator (BOUNTY, ACTIVE, FIXED, 1 winner + 1 bonus) ---
	const b7RequiredSlugs = new Set(['sveltekit', 'api-integration']);
	const b7SkillRows = await prisma.skill.findMany({
		where: { slug: { in: ['sveltekit', 'typescript', 'api-integration', 'ui-design'] } }
	});
	const b7 = await prisma.bounty.upsert({
		where: { slug: 'diaspora-remittance-fee-comparator-2026' },
		update: {},
		create: {
			companyProfileId,
			title: 'Diaspora Remittance Fee Comparator — SL Corridors',
			slug: 'diaspora-remittance-fee-comparator-2026',
			type: BountyType.BOUNTY,
			status: BountyStatus.ACTIVE,
			compensationType: CompensationType.FIXED,
			currency: 'SLE',
			totalPrizePool: 4_000_000 * SLE,
			numberOfWinners: 1,
			maxBonusSpots: 1,
			submissionDeadline: future(25),
			judgingDeadline: future(40),
			publishedAt: past(1),
			description:
				'<p>Build a public web tool that lets diaspora senders compare fees and FX margins for sending USD, GBP, and EUR to Sierra Leone (SLE). Cover the main corridors used by the SL diaspora — including WorldRemit, Sendwave, Western Union, and MoneyGram — and surface the true delivered amount in SLE per 100 of sending currency.</p>',
			requirements:
				'<ul><li>Mobile-first responsive web app, fast on a 3G connection</li><li>Support at least four providers and three sending currencies (USD, GBP, EUR)</li><li>Show: advertised fee, FX margin vs. mid-market rate, total delivered SLE per 100 sent</li><li>Either daily auto-refresh from provider APIs/scrapes, or a clearly documented manual update workflow with timestamps</li><li>Source code on GitHub under an OSI-approved license</li></ul>',
			deliverables:
				'<ul><li>Deployed URL (Vercel, Netlify, or similar)</li><li>GitHub repo with README and setup instructions</li><li>Short Loom / video walkthrough (3–5 min) showing the comparison flow</li></ul>',
			prizeTiers: {
				create: [
					{ position: 1, amount: 3_000_000 * SLE, label: 'Winner' },
					{ position: 99, amount: 1_000_000 * SLE, label: 'Bonus Prize' }
				]
			},
			skills: {
				create: b7SkillRows.map((s) => ({
					skillId: s.id,
					isRequired: b7RequiredSlugs.has(s.slug)
				}))
			}
		}
	});
	console.log(`✓ Bounty: ${b7.title}`);

	// --- Project 1: Tourism Booking MVP — Banana Islands & Tiwai (PROJECT, ACTIVE, FIXED) ---
	const p1RequiredSlugs = new Set(['sveltekit', 'typescript', 'postgresql']);
	const p1SkillRows = await prisma.skill.findMany({
		where: {
			slug: { in: ['sveltekit', 'typescript', 'postgresql', 'mobile-app-development', 'ui-design'] }
		}
	});
	const p1 = await prisma.bounty.upsert({
		where: { slug: 'tourism-booking-mvp-banana-tiwai-2026' },
		update: {},
		create: {
			companyProfileId,
			title: 'Tourism Booking MVP — Banana Islands & Tiwai Island',
			slug: 'tourism-booking-mvp-banana-tiwai-2026',
			type: BountyType.PROJECT,
			status: BountyStatus.ACTIVE,
			compensationType: CompensationType.FIXED,
			currency: 'SLE',
			totalPrizePool: 8_000_000 * SLE,
			numberOfWinners: 1,
			maxBonusSpots: 0,
			timeToComplete: '6 weeks',
			submissionDeadline: future(40),
			judgingDeadline: future(55),
			publishedAt: past(3),
			description:
				"<p>Build an MVP booking platform for two of Sierra Leone's standout eco-tourism destinations: the Banana Islands and Tiwai Island Wildlife Sanctuary. The goal is a single web app that lets travellers discover stays and experiences, check availability, and book — while giving local operators a simple back-office to manage their listings.</p>",
			requirements:
				'<ul><li>Public listings pages with photos, descriptions, and pricing for at least four operator profiles (we will supply sample content)</li><li>Availability calendar and booking flow with guest details, party size, and dates</li><li>Mobile-money checkout via the Monime sandbox (test mode is fine for the MVP)</li><li>Operator dashboard: create/edit listings, see upcoming bookings, mark check-ins</li><li>Confirmation email + itinerary to the guest after booking</li><li>Copy available in both Krio and English (UI toggle)</li></ul>',
			deliverables:
				'<ul><li>Deployed URL with at least one demo operator account and one demo guest account</li><li>GitHub repo with README, environment template, and run instructions</li><li>Brief design rationale doc (Figma link or PDF, 2–4 pages) covering the booking and operator flows</li></ul>',
			prizeTiers: {
				create: [{ position: 1, amount: 8_000_000 * SLE, label: 'Selected Builder' }]
			},
			skills: {
				create: p1SkillRows.map((s) => ({
					skillId: s.id,
					isRequired: p1RequiredSlugs.has(s.slug)
				}))
			}
		}
	});
	console.log(`✓ Project: ${p1.title}`);

	// --- Project 2: Clinic Appointment Booking — Bo & Kenema Pilot (PROJECT, ACTIVE, FIXED) ---
	const p2RequiredSlugs = new Set(['sveltekit', 'typescript', 'sms-gateway']);
	const p2SkillRows = await prisma.skill.findMany({
		where: {
			slug: {
				in: ['sveltekit', 'typescript', 'sms-gateway', 'postgresql', 'mobile-app-development']
			}
		}
	});
	const p2 = await prisma.bounty.upsert({
		where: { slug: 'clinic-appointment-booking-bo-kenema-2026' },
		update: {},
		create: {
			companyProfileId,
			title: 'Clinic Appointment Booking — Bo & Kenema District Pilot',
			slug: 'clinic-appointment-booking-bo-kenema-2026',
			type: BountyType.PROJECT,
			status: BountyStatus.ACTIVE,
			compensationType: CompensationType.FIXED,
			currency: 'SLE',
			totalPrizePool: 7_500_000 * SLE,
			numberOfWinners: 1,
			maxBonusSpots: 0,
			timeToComplete: '5 weeks',
			submissionDeadline: future(45),
			judgingDeadline: future(60),
			publishedAt: past(4),
			description:
				'<p>Build a clinic appointment booking app for a four-clinic pilot across Bo and Kenema districts. The pilot operates outside Freetown, where connectivity is unstable and many patients use feature phones — so the system must lean on SMS for reminders and confirmations, and the patient UI must work well on low-end Android devices.</p>',
			requirements:
				"<ul><li>Patient-facing Android-first web UI: pick clinic, pick day/time slot, enter name + phone + reason for visit</li><li>SMS confirmation on booking and SMS reminder 24 hours before the appointment (Africa's Talking or Twilio, sandbox is fine for the pilot)</li><li>Offline-tolerant intake form: works on slow / dropping connections, retries on reconnect</li><li>Clinic-side admin: see today's and tomorrow's schedule, mark show / no-show, cancel slot</li><li>Designed for unstable 2G/3G connectivity in Bo and Kenema — minimise payload, avoid heavy client JS</li></ul>",
			deliverables:
				'<ul><li>Deployed URL with at least four seeded clinics (Bo: 2, Kenema: 2) and demo admin accounts</li><li>GitHub repo with README, env template, and a runbook for the clinic admins</li><li>Short walkthrough video (5–8 min) covering a patient booking + an admin checking the daily schedule</li></ul>',
			prizeTiers: {
				create: [{ position: 1, amount: 7_500_000 * SLE, label: 'Selected Builder' }]
			},
			skills: {
				create: p2SkillRows.map((s) => ({
					skillId: s.id,
					isRequired: p2RequiredSlugs.has(s.slug)
				}))
			}
		}
	});
	console.log(`✓ Project: ${p2.title}`);

	// --- Submission on bounty 4 (JUDGING) from the test freelancer ---
	const existingSubmission = await prisma.submission.findUnique({
		where: { bountyId_freelancerProfileId: { bountyId: b4.id, freelancerProfileId } }
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
				ask: 5_500_000 * SLE
			}
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
	console.log('ACTIVE   Pharmacy Stock-Out Open Dataset — Freetown');
	console.log('ACTIVE   Diaspora Remittance Fee Comparator — SL Corridors');
	console.log('ACTIVE   Tourism Booking MVP — Banana Islands & Tiwai Island (PROJECT)');
	console.log('ACTIVE   Clinic Appointment Booking — Bo & Kenema District Pilot (PROJECT)');

	await prisma.$disconnect();
}

main().catch(async (e) => {
	console.error(e);
	await prisma.$disconnect();
	process.exit(1);
});
