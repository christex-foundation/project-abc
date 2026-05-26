<script lang="ts">
	import { untrack } from 'svelte';
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
	let momoNumber = $state(untrack(() => data.profile.momoNumber ?? ''));
	let whatsappNumber = $state(untrack(() => data.profile.whatsappNumber ?? ''));

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
					momoNumber: momoNumber || null,
					whatsappNumber: whatsappNumber || null,
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
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold">Your profile</h1>
		<p class="text-sm text-zinc-500">
			Skills and headline power your bounty recommendations.
			<a href="/dashboard/freelancer/recommendations" class="underline">See your matches</a>.
		</p>
	</header>

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
			<div class="grid gap-4 sm:grid-cols-3">
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
					<Label for="momoNumber">Mobile money</Label>
					<Input id="momoNumber" bind:value={momoNumber} maxlength={40} placeholder="+232 …" />
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
		</CardContent>
	</Card>

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
					<div class="text-sm font-medium text-zinc-700">{cat.name}</div>
					<div class="flex flex-wrap gap-2">
						{#each cat.skills as skill (skill.id)}
							{@const sel = isSelected(skill.id)}
							{@const current = selected.find((s) => s.skillId === skill.id)}
							<div
								class={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${sel ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200'}`}
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
												class={`h-5 w-5 rounded text-xs ${current.proficiencyLevel >= level ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}
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
			<div class="text-xs text-zinc-500">
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
