// localStorage draft keys used by useLocalDraft (which prepends `fow:draft:`).
// Centralised so the AI decider and the create pages can never silently diverge.
// NOTE: the version suffixes were bumped (v3→v4, project +v2) when form amount
// fields switched from minor units to major-unit Leones — a stale draft saved in
// minor units must not be restored into a major-unit form (it would read 100x high).
export const DRAFT_KEYS = {
	bountyCreate: 'bounty-create-wizard-v4',
	projectCreate: 'project-create-form-v2'
} as const;

// Fully-prefixed keys, for callers that write to localStorage directly (the AI
// decider does not go through useLocalDraft).
export const DRAFT_STORAGE_KEYS = {
	bountyCreate: `fow:draft:${DRAFT_KEYS.bountyCreate}`,
	projectCreate: `fow:draft:${DRAFT_KEYS.projectCreate}`
} as const;
