<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { apiFetch } from '$lib/client/net';
	import {
		Badge,
		Button,
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle,
		Input,
		Label,
		Select,
		Textarea
	} from '$lib/components/ui';
	import WithdrawalForm from '$lib/components/shared/WithdrawalForm.svelte';
	import WithdrawalDestination, {
		type Destination
	} from '$lib/components/shared/WithdrawalDestination.svelte';
	import AvatarUpload from '$lib/components/shared/AvatarUpload.svelte';
	import ProfileShareCard from '$lib/components/shared/ProfileShareCard.svelte';
	import ProofOfWorkCard from '$lib/components/freelancer/ProofOfWorkCard.svelte';
	import {
		PROVINCES,
		DISTRICT_LABEL,
		districtsForProvince,
		type Province,
		type District
	} from '$lib/constants/geo';

	let { data } = $props();

	type SelectedSkill = {
		skillId: string;
		proficiencyLevel: number;
		yearsExperience: number | null;
	};

	let displayName = $state(untrack(() => data.profile.displayName));
	let headline = $state(untrack(() => data.profile.headline ?? ''));
	let bio = $state(untrack(() => data.profile.bio ?? ''));
	let portfolio = $state(untrack(() => data.profile.portfolio ?? ''));
	let experienceLevel = $state(untrack(() => data.profile.experienceLevel ?? ''));
	let whatsappNumber = $state(untrack(() => data.profile.whatsappNumber ?? ''));
	let province = $state<Province | ''>(untrack(() => data.profile.province ?? ''));
	let district = $state<District | ''>(untrack(() => data.profile.district ?? ''));

	const districtOptions = $derived(province ? districtsForProvince(province) : []);
	// Drop a stale district whenever the province changes to one that no longer
	// contains it. Runs after `province` is committed, so it can't race the bind.
	$effect(() => {
		if (district && !districtOptions.includes(district as District)) district = '';
	});

	let selected = $state<SelectedSkill[]>(
		untrack(() =>
			data.profile.skills.map((s) => ({
				skillId: s.skillId,
				proficiencyLevel: s.proficiencyLevel,
				yearsExperience: s.yearsExperience
			}))
		)
	);

	let saving = $state(false);
	let savedAt = $state<Date | null>(null);
	let errorMsg = $state<string | null>(null);

	// Avatar (User.image, or DiceBear fallback from the server load).
	let avatarSrc = $state(untrack(() => data.avatar));

	async function onAvatarUploaded(url: string) {
		const res = await fetch('/api/users/me/avatar', {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ imageUrl: url })
		});
		if (res.ok) {
			avatarSrc = url;
			// Refresh server load data (layout + page) so the TopNav avatar and any
			// other profile-driven UI pick up the new image right away.
			await invalidateAll();
		}
	}

	// Wallet — the balance lives on Monime; we just fetch and render it.
	let accountId = $state<string | null>(
		untrack(() => data.profile.monimeFinancialAccountId ?? null)
	);
	let balance = $state<number | null>(null);
	let accountLoading = $state(false);
	let activating = $state(false);

	// Verified mobile money withdrawal destination
	let destination = $state<Destination | null>(
		untrack(() =>
			data.profile.withdrawalPhone && data.profile.withdrawalVerifiedAt
				? {
						phone: data.profile.withdrawalPhone,
						holderName: data.profile.withdrawalHolderName ?? '',
						providerName: data.profile.withdrawalProviderName ?? ''
					}
				: null
		)
	);

	let showWithdraw = $state(false);

	async function loadBalance() {
		if (!accountId) return;
		accountLoading = true;
		try {
			// Background load — stay quiet on network failure (the balance just
			// shows "—"); the user can pull-to-refresh / reload.
			const res = await apiFetch('/api/users/me/financial-account', undefined, {
				toastOnError: false
			});
			if (res.ok) {
				const body = await res.json();
				balance = body.balance;
			}
		} catch {
			// Offline / timeout — leave balance as-is.
		} finally {
			accountLoading = false;
		}
	}

	onMount(loadBalance);

	async function activateWallet() {
		activating = true;
		try {
			const res = await apiFetch(
				'/api/users/me/financial-account',
				{ method: 'POST' },
				{
					retry: activateWallet
				}
			);
			if (res.ok) {
				const body = await res.json();
				accountId = body.accountId;
				balance = body.balance;
			}
		} catch {
			// Network failure already surfaced via toast by apiFetch.
		} finally {
			activating = false;
		}
	}

	function formatMoney(minor: number | null, currency = 'SLE') {
		if (minor == null) return '—';
		return `${currency} ${(minor / 100).toLocaleString()}`;
	}

	function isSelected(skillId: string): boolean {
		return selected.some((s) => s.skillId === skillId);
	}

	function toggleSkill(skillId: string) {
		const idx = selected.findIndex((s) => s.skillId === skillId);
		if (idx === -1) {
			selected = [...selected, { skillId, proficiencyLevel: 3, yearsExperience: null }];
		} else {
			selected = selected.filter((_, i) => i !== idx);
		}
	}

	function setProficiency(skillId: string, level: number) {
		selected = selected.map((s) => (s.skillId === skillId ? { ...s, proficiencyLevel: level } : s));
	}

	async function save() {
		saving = true;
		errorMsg = null;
		try {
			const res = await fetch('/api/users/me', {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					displayName,
					headline: headline || null,
					bio: bio || null,
					portfolio: portfolio || null,
					experienceLevel: experienceLevel || null,
					whatsappNumber: whatsappNumber || null,
					province: province || null,
					district: district || null,
					skills: selected
				})
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.error?.message ?? `Save failed (${res.status})`;
				return;
			}
			savedAt = new Date();
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<header class="space-y-4">
		<div class="space-y-1">
			<h1 class="fow-display text-ink text-3xl">Your profile</h1>
			<p class="text-ink-soft text-sm">
				Skills and headline power your bounty recommendations.
				<a href="/dashboard/freelancer/recommendations" class="underline">See your matches</a>.
			</p>
		</div>
		<AvatarUpload
			current={avatarSrc}
			purpose="avatar"
			alt={displayName}
			onUploaded={onAvatarUploaded}
			label="Change photo"
		/>
	</header>

	<ProfileShareCard handle={data.handle} name={displayName} />

	<Card>
		<CardHeader>
			<CardTitle>About you</CardTitle>
			<CardDescription>Visible to sponsors when you submit to a bounty.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1">
					<Label for="displayName">Display name</Label>
					<Input id="displayName" bind:value={displayName} maxlength={120} required />
				</div>
				<div class="space-y-1">
					<Label for="experienceLevel">Experience level</Label>
					<Select id="experienceLevel" bind:value={experienceLevel}>
						<option value="">—</option>
						<option value="JUNIOR">Junior (0–2 yrs)</option>
						<option value="MID">Mid (2–5 yrs)</option>
						<option value="SENIOR">Senior (5+ yrs)</option>
					</Select>
				</div>
			</div>
			<div class="space-y-1">
				<Label for="headline">Headline</Label>
				<Input
					id="headline"
					bind:value={headline}
					maxlength={200}
					placeholder="e.g. Mobile money integrations engineer"
				/>
			</div>
			<div class="space-y-1">
				<Label for="bio">Bio</Label>
				<Textarea
					id="bio"
					bind:value={bio}
					maxlength={5000}
					rows={5}
					placeholder="What you build, the problems you like, where you've shipped."
				/>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1">
					<Label for="portfolio">Portfolio URL</Label>
					<Input
						id="portfolio"
						type="url"
						bind:value={portfolio}
						maxlength={500}
						placeholder="https://"
					/>
				</div>
				<div class="space-y-1">
					<Label for="whatsappNumber">WhatsApp</Label>
					<Input
						id="whatsappNumber"
						bind:value={whatsappNumber}
						maxlength={40}
						placeholder="+232 …"
					/>
				</div>
			</div>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1">
					<Label for="province">Province</Label>
					<Select id="province" bind:value={province}>
						<option value="">—</option>
						{#each PROVINCES as p (p.value)}
							<option value={p.value}>{p.label}</option>
						{/each}
					</Select>
				</div>
				<div class="space-y-1">
					<Label for="district">District</Label>
					<Select id="district" bind:value={district} disabled={!province}>
						<option value="">—</option>
						{#each districtOptions as d (d)}
							<option value={d}>{DISTRICT_LABEL[d]}</option>
						{/each}
					</Select>
				</div>
			</div>
			<p class="text-ink-soft text-xs">
				Your province lets you submit to region-locked bounties. Some sponsors restrict bounties to
				freelancers in a specific province.
			</p>
		</CardContent>
	</Card>

	<!-- Wallet card -->
	<Card>
		<CardHeader>
			<CardTitle>Wallet</CardTitle>
			<CardDescription>Receive your bounty earnings and withdraw to mobile money.</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if !accountId}
				<p class="text-ink-soft text-sm">Activate your wallet to receive prize payouts.</p>
				<Button onclick={activateWallet} disabled={activating} variant="outline">
					{activating ? 'Activating…' : 'Activate wallet'}
				</Button>
			{:else}
				<div class="space-y-3">
					<div class="bg-paper flex items-center justify-between rounded-md px-3 py-2">
						<div class="space-y-0.5">
							<p class="text-ink-soft font-mono text-xs font-medium tracking-wide uppercase">
								Balance
							</p>
							<p class="text-sm font-semibold">
								{accountLoading ? 'Loading…' : formatMoney(balance)}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							onclick={() => (showWithdraw = !showWithdraw)}
							disabled={!destination}
							title={destination ? '' : 'Set up your withdrawal mobile number first'}
						>
							{showWithdraw ? 'Cancel' : 'Withdraw'}
						</Button>
					</div>

					<!-- Withdrawal destination -->
					<WithdrawalDestination bind:destination />

					{#if showWithdraw && destination}
						<div class="border-bone rounded-md border p-4">
							<p class="mb-3 text-sm font-medium">Withdraw to mobile money</p>
							<WithdrawalForm {destination} />
						</div>
					{/if}
				</div>
			{/if}
		</CardContent>
	</Card>

	<ProofOfWorkCard items={data.proofOfWork} skillCategories={data.skillCategories} />

	<Card>
		<CardHeader>
			<CardTitle>Skills</CardTitle>
			<CardDescription>
				Tick the ones you can deliver against. Set a proficiency from 1 (learning) to 5 (expert).
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-6">
			{#each data.skillCategories as cat (cat.id)}
				<div class="space-y-2">
					<div class="text-ink text-sm font-medium">{cat.name}</div>
					<div class="flex flex-wrap gap-2">
						{#each cat.skills.filter((s) => s.parentSkillId !== null) as skill (skill.id)}
							{@const sel = isSelected(skill.id)}
							{@const current = selected.find((s) => s.skillId === skill.id)}
							<div
								class={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${sel ? 'border-ink bg-paper' : 'border-bone'}`}
							>
								<button type="button" onclick={() => toggleSkill(skill.id)} class="hover:underline">
									{skill.name}
								</button>
								{#if sel && current}
									<div class="flex gap-0.5">
										{#each [1, 2, 3, 4, 5] as level}
											<button
												type="button"
												onclick={() => setProficiency(skill.id, level)}
												aria-label={`Proficiency ${level}`}
												class={`h-5 w-5 rounded text-xs ${current.proficiencyLevel >= level ? 'bg-ink text-cream' : 'bg-paper text-ink-soft'}`}
											>
												{level}
											</button>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
			<div class="text-ink-soft text-xs">
				{selected.length} skill{selected.length === 1 ? '' : 's'} selected.
			</div>
		</CardContent>
	</Card>

	<div class="flex items-center gap-3">
		<Button onclick={save} disabled={saving}>
			{saving ? 'Saving…' : 'Save profile'}
		</Button>
		{#if savedAt}
			<Badge variant="success">Saved {savedAt.toLocaleTimeString()}</Badge>
		{/if}
		{#if errorMsg}
			<span class="text-sm text-red-600">{errorMsg}</span>
		{/if}
	</div>
</div>
