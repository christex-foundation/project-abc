<script lang="ts">
	import AdminNav from './AdminNav.svelte';

	type Props = {
		badges: {
			openDisputes: number;
			pendingInvites: number;
			failedPayments: number;
		};
	};

	let { badges }: Props = $props();
</script>

<!-- Desktop sidebar. The mobile equivalent is a drawer in admin/+layout.svelte;
     both render the shared AdminNav. -->
<aside class="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-zinc-800 md:block">
	<AdminNav {badges} />
</aside>
