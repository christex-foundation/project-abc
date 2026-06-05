<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { PageHeader, Card, Button, Input, Label, Checkbox } from '$lib/components/ui';
	import Save from '@lucide/svelte/icons/save';
	import AlertOctagon from '@lucide/svelte/icons/alert-octagon';

	let { data } = $props();

	type SocialLinks = {
		twitter?: string;
		linkedin?: string;
		facebook?: string;
		instagram?: string;
		youtube?: string;
		discord?: string;
		whatsapp?: string;
	};
	type LegalLinks = {
		termsUrl?: string;
		privacyUrl?: string;
		refundUrl?: string;
		aboutUrl?: string;
	};
	type FeatureFlags = {
		maintenanceMode?: boolean;
		maintenanceMessage?: string;
		signupDisabled?: boolean;
		bountyCreationDisabled?: boolean;
		paymentsPaused?: boolean;
	};

	// Existing settings
	// svelte-ignore state_referenced_locally
	let companyEnabled = $state(
		(data.settings?.COMPANY_SELF_REGISTER as { enabled?: boolean } | undefined)?.enabled === true
	);
	// svelte-ignore state_referenced_locally
	let aiAssistEnabled = $state(
		(data.settings?.AI_ASSIST_ENABLED as { enabled?: boolean } | undefined)?.enabled === true
	);
	// svelte-ignore state_referenced_locally
	const creditSetting = data.settings?.FREELANCER_CREDIT_SYSTEM as
		| { enabled?: boolean; monthlyAllocation?: number }
		| undefined;
	// svelte-ignore state_referenced_locally
	let creditsEnabled = $state(creditSetting?.enabled === true);
	// svelte-ignore state_referenced_locally
	let monthlyAllocation = $state(creditSetting?.monthlyAllocation ?? 3);
	// svelte-ignore state_referenced_locally
	const referralSetting = data.settings?.FREELANCER_REFERRAL_SYSTEM as
		| {
				enabled?: boolean;
				maxReferrals?: number;
				creditsPerFirstSubmission?: number;
				creditsPerWin?: number;
		  }
		| undefined;
	// svelte-ignore state_referenced_locally
	let referralEnabled = $state(referralSetting?.enabled === true);
	// svelte-ignore state_referenced_locally
	let maxReferrals = $state(referralSetting?.maxReferrals ?? 10);
	// svelte-ignore state_referenced_locally
	let creditsPerFirstSubmission = $state(referralSetting?.creditsPerFirstSubmission ?? 1);
	// svelte-ignore state_referenced_locally
	let creditsPerWin = $state(referralSetting?.creditsPerWin ?? 2);

	// New settings — read once at mount time only; subsequent updates flow through
	// the local $state values until the user clicks Save and invalidates.
	// svelte-ignore state_referenced_locally
	const socialInit = (data.settings?.SOCIAL_LINKS as SocialLinks | undefined) ?? {};
	// svelte-ignore state_referenced_locally
	const legalInit = (data.settings?.LEGAL_LINKS as LegalLinks | undefined) ?? {};
	// svelte-ignore state_referenced_locally
	const flagsInit = (data.settings?.FEATURE_FLAGS as FeatureFlags | undefined) ?? {};

	let social = $state<Required<SocialLinks>>({
		twitter: socialInit.twitter ?? '',
		linkedin: socialInit.linkedin ?? '',
		facebook: socialInit.facebook ?? '',
		instagram: socialInit.instagram ?? '',
		youtube: socialInit.youtube ?? '',
		discord: socialInit.discord ?? '',
		whatsapp: socialInit.whatsapp ?? ''
	});
	let legal = $state<Required<LegalLinks>>({
		termsUrl: legalInit.termsUrl ?? '',
		privacyUrl: legalInit.privacyUrl ?? '',
		refundUrl: legalInit.refundUrl ?? '',
		aboutUrl: legalInit.aboutUrl ?? ''
	});
	let flags = $state<Required<FeatureFlags>>({
		maintenanceMode: flagsInit.maintenanceMode ?? false,
		maintenanceMessage: flagsInit.maintenanceMessage ?? '',
		signupDisabled: flagsInit.signupDisabled ?? false,
		bountyCreationDisabled: flagsInit.bountyCreationDisabled ?? false,
		paymentsPaused: flagsInit.paymentsPaused ?? false
	});

	let savingKey = $state<string | null>(null);

	async function saveSetting(key: string, value: unknown, label: string) {
		savingKey = key;
		try {
			const res = await fetch('/api/admin/settings', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ key, value })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				toast.error(body?.error?.message ?? 'Failed to save.');
				return;
			}
			toast.success(`${label} saved.`);
			await invalidateAll();
		} finally {
			savingKey = null;
		}
	}

	const SOCIAL_FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
		{ key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/fow' },
		{ key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/fow' },
		{ key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/fow' },
		{ key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/fow' },
		{ key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@fow' },
		{ key: 'discord', label: 'Discord', placeholder: 'https://discord.gg/...' },
		{ key: 'whatsapp', label: 'WhatsApp', placeholder: 'https://wa.me/...' }
	];

	const LEGAL_FIELDS: { key: keyof LegalLinks; label: string; placeholder: string }[] = [
		{ key: 'termsUrl', label: 'Terms of service', placeholder: 'https://fow.sl/legal/terms' },
		{ key: 'privacyUrl', label: 'Privacy policy', placeholder: 'https://fow.sl/legal/privacy' },
		{ key: 'refundUrl', label: 'Refund policy', placeholder: 'https://fow.sl/legal/refunds' },
		{ key: 'aboutUrl', label: 'About / Mission', placeholder: 'https://fow.sl/about' }
	];

	const SECTIONS = [
		{ id: 'platform', label: 'Platform' },
		{ id: 'ai', label: 'AI assist' },
		{ id: 'credits', label: 'Credits' },
		{ id: 'referrals', label: 'Referrals' },
		{ id: 'social', label: 'Social links' },
		{ id: 'legal', label: 'Legal links' },
		{ id: 'flags', label: 'Feature flags' }
	];
</script>

<PageHeader
	title="Platform settings"
	description="Toggles, social presence, legal links, and incident-response flags."
/>

<div class="grid gap-6 lg:grid-cols-[180px_1fr]">
	<nav class="hidden lg:block">
		<ul class="sticky top-24 space-y-1 text-sm">
			{#each SECTIONS as s (s.id)}
				<li>
					<a
						class="block rounded px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
						href="#{s.id}"
					>
						{s.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="space-y-6">
		<!-- PLATFORM -->
		<Card id="platform" class="p-5">
			<h2 class="text-sm font-semibold text-zinc-900">Company self-register</h2>
			<p class="mt-1 text-xs text-zinc-500">
				When OFF, the public <code>/register</code> page hides the COMPANY role. Admins can still invite
				companies via the Invites page.
			</p>
			<label class="mt-3 flex items-center gap-2 text-sm">
				<Checkbox bind:checked={companyEnabled} />
				Enabled
			</label>
			<div class="mt-4">
				<Button
					size="sm"
					disabled={savingKey === 'COMPANY_SELF_REGISTER'}
					onclick={() =>
						saveSetting('COMPANY_SELF_REGISTER', { enabled: companyEnabled }, 'Self-register')}
				>
					<Save class="h-3.5 w-3.5" /> Save
				</Button>
			</div>
		</Card>

		<!-- AI ASSIST -->
		<Card id="ai" class="p-5">
			<h2 class="text-sm font-semibold text-zinc-900">AI assist (experiment)</h2>
			<p class="mt-1 text-xs text-zinc-500">
				Turns on the AI helpers: the "Ask AI to draft this" decider on the create flow, the proposal
				shortlist for project owners, and "Coach me" on bounty/project pages. AI only drafts — a
				human still reviews and submits everything. Also requires
				<code>ANTHROPIC_API_KEY</code> on the server; without it this stays off no matter what.
			</p>
			<label class="mt-3 flex items-center gap-2 text-sm">
				<Checkbox bind:checked={aiAssistEnabled} />
				Enabled
			</label>
			<div class="mt-4">
				<Button
					size="sm"
					disabled={savingKey === 'AI_ASSIST_ENABLED'}
					onclick={() =>
						saveSetting('AI_ASSIST_ENABLED', { enabled: aiAssistEnabled }, 'AI assist')}
				>
					<Save class="h-3.5 w-3.5" /> Save
				</Button>
			</div>
		</Card>

		<!-- CREDITS -->
		<Card id="credits" class="p-5">
			<h2 class="text-sm font-semibold text-zinc-900">Freelancer credit system</h2>
			<p class="mt-1 text-xs text-zinc-500">
				Each non-exempt submission costs 1 credit. Wins +1, spam −1 (floor 0). Resets monthly.
			</p>
			<label class="mt-3 flex items-center gap-2 text-sm">
				<Checkbox bind:checked={creditsEnabled} />
				Enabled
			</label>
			<div class="mt-3 flex items-end gap-3">
				<div>
					<Label for="monthly">Monthly allocation</Label>
					<Input
						id="monthly"
						type="number"
						min="0"
						max="100"
						step="1"
						bind:value={monthlyAllocation}
						class="!w-32"
					/>
				</div>
				<Button
					size="sm"
					disabled={savingKey === 'FREELANCER_CREDIT_SYSTEM'}
					onclick={() =>
						saveSetting(
							'FREELANCER_CREDIT_SYSTEM',
							{ enabled: creditsEnabled, monthlyAllocation: Number(monthlyAllocation) },
							'Credit system'
						)}
				>
					<Save class="h-3.5 w-3.5" /> Save
				</Button>
			</div>
		</Card>

		<!-- REFERRALS -->
		<Card id="referrals" class="p-5">
			<h2 class="text-sm font-semibold text-zinc-900">Freelancer referral system</h2>
			<p class="mt-1 text-xs text-zinc-500">
				Earns referrer credits on a referred friend's first submission and wins. Requires credits to
				be enabled.
			</p>
			<label class="mt-3 flex items-center gap-2 text-sm">
				<Checkbox bind:checked={referralEnabled} />
				Enabled
			</label>
			<div class="mt-3 grid grid-cols-3 gap-3">
				<div>
					<Label for="maxRef">Max referrals</Label>
					<Input id="maxRef" type="number" min="0" max="1000" bind:value={maxReferrals} />
				</div>
				<div>
					<Label for="first">Credits per 1st submission</Label>
					<Input
						id="first"
						type="number"
						min="0"
						max="100"
						bind:value={creditsPerFirstSubmission}
					/>
				</div>
				<div>
					<Label for="win">Credits per win</Label>
					<Input id="win" type="number" min="0" max="100" bind:value={creditsPerWin} />
				</div>
			</div>
			<div class="mt-4">
				<Button
					size="sm"
					disabled={savingKey === 'FREELANCER_REFERRAL_SYSTEM'}
					onclick={() =>
						saveSetting(
							'FREELANCER_REFERRAL_SYSTEM',
							{
								enabled: referralEnabled,
								maxReferrals: Number(maxReferrals),
								creditsPerFirstSubmission: Number(creditsPerFirstSubmission),
								creditsPerWin: Number(creditsPerWin)
							},
							'Referral system'
						)}
				>
					<Save class="h-3.5 w-3.5" /> Save
				</Button>
			</div>
		</Card>

		<!-- SOCIAL LINKS -->
		<Card id="social" class="p-5">
			<h2 class="text-sm font-semibold text-zinc-900">Social links</h2>
			<p class="mt-1 text-xs text-zinc-500">
				URLs surfaced in the public footer. Leave blank to hide.
			</p>
			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				{#each SOCIAL_FIELDS as f (f.key)}
					<div>
						<Label for={`s-${f.key}`}>{f.label}</Label>
						<Input id={`s-${f.key}`} bind:value={social[f.key]} placeholder={f.placeholder} />
					</div>
				{/each}
			</div>
			<div class="mt-4">
				<Button
					size="sm"
					disabled={savingKey === 'SOCIAL_LINKS'}
					onclick={() => saveSetting('SOCIAL_LINKS', social, 'Social links')}
				>
					<Save class="h-3.5 w-3.5" /> Save
				</Button>
			</div>
		</Card>

		<!-- LEGAL LINKS -->
		<Card id="legal" class="p-5">
			<h2 class="text-sm font-semibold text-zinc-900">Legal &amp; policy links</h2>
			<p class="mt-1 text-xs text-zinc-500">URLs shown in the footer and at signup/checkout.</p>
			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				{#each LEGAL_FIELDS as f (f.key)}
					<div>
						<Label for={`l-${f.key}`}>{f.label}</Label>
						<Input id={`l-${f.key}`} bind:value={legal[f.key]} placeholder={f.placeholder} />
					</div>
				{/each}
			</div>
			<div class="mt-4">
				<Button
					size="sm"
					disabled={savingKey === 'LEGAL_LINKS'}
					onclick={() => saveSetting('LEGAL_LINKS', legal, 'Legal links')}
				>
					<Save class="h-3.5 w-3.5" /> Save
				</Button>
			</div>
		</Card>

		<!-- FEATURE FLAGS -->
		<Card id="flags" class="border-amber-200 p-5">
			<div class="flex items-start gap-2">
				<AlertOctagon class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
				<div>
					<h2 class="text-sm font-semibold text-zinc-900">Feature flags &amp; maintenance</h2>
					<p class="mt-1 text-xs text-zinc-500">
						Incident-response toggles. Only <strong>maintenance mode</strong> is wired today (shows a
						banner across the admin console); the other flags are persisted here and will be enforced
						by their feature owners in a follow-up.
					</p>
				</div>
			</div>
			<div class="mt-4 space-y-3">
				<label class="flex items-start gap-2 text-sm">
					<Checkbox bind:checked={flags.maintenanceMode} class="mt-0.5" />
					<div>
						<div class="font-medium">Maintenance mode</div>
						<div class="text-xs text-zinc-500">
							Display a maintenance banner across the platform.
						</div>
					</div>
				</label>
				<div>
					<Label for="msg">Maintenance message</Label>
					<Input
						id="msg"
						bind:value={flags.maintenanceMessage}
						placeholder="We'll be back in 30 minutes."
					/>
				</div>
				<label class="flex items-start gap-2 text-sm">
					<Checkbox bind:checked={flags.signupDisabled} class="mt-0.5" />
					<div>
						<div class="font-medium">Disable new signups</div>
						<div class="text-xs text-zinc-500">Block public /register submissions.</div>
					</div>
				</label>
				<label class="flex items-start gap-2 text-sm">
					<Checkbox bind:checked={flags.bountyCreationDisabled} class="mt-0.5" />
					<div>
						<div class="font-medium">Disable bounty creation</div>
						<div class="text-xs text-zinc-500">Companies cannot start new bounties.</div>
					</div>
				</label>
				<label class="flex items-start gap-2 text-sm">
					<Checkbox bind:checked={flags.paymentsPaused} class="mt-0.5" />
					<div>
						<div class="font-medium">Pause payments</div>
						<div class="text-xs text-zinc-500">Block new escrow deposits and payouts.</div>
					</div>
				</label>
			</div>
			<div class="mt-4">
				<Button
					size="sm"
					disabled={savingKey === 'FEATURE_FLAGS'}
					onclick={() => saveSetting('FEATURE_FLAGS', flags, 'Feature flags')}
				>
					<Save class="h-3.5 w-3.5" /> Save
				</Button>
			</div>
		</Card>
	</div>
</div>
