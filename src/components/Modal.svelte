<script>
	import { createEventDispatcher, onDestroy } from 'svelte';

	const dispatch = createEventDispatcher();
	const close = () => dispatch('close');

	let modal;
	let modal_background;

	const handle_keydown = e => {
		if (e.key === 'Escape') {
			close();
			return;
		}

		if (e.key === 'Tab') {
			// trap focus
			const nodes = modal.querySelectorAll('*');
			const tabbable = Array.from(nodes).filter(n => n.tabIndex >= 0);

			let index = tabbable.indexOf(document.activeElement);
			if (index === -1 && e.shiftKey) index = 0;

			index += tabbable.length + (e.shiftKey ? -1 : 1);
			index %= tabbable.length;

			tabbable[index].focus();
			e.preventDefault();
		}
	};

	const previously_focused = typeof document !== 'undefined' && document.activeElement;

	if (previously_focused) {
		onDestroy(() => {
			previously_focused.focus();
		});
	}
</script>

<svelte:window on:keydown={handle_keydown}/>

<div class="modal-background" on:click={close} on:keypress={handle_keydown} bind:this={modal_background}></div>

<div class="modal" role="dialog" aria-modal="true" bind:this={modal} on:close={close}>
	<div class="frontpageengine-modal-title">
		<h3><slot name="title"></slot></h3>
	</div>
	<div class="frontpageengine-modal-content">
		<slot></slot>
	</div>
	<div class="frontpageengine-modal-footer">
		<slot name="footer"></slot>
	</div>
</div>

<style>
	.modal-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0,0,0,0.3);
        z-index: 10000;
	}

	.modal {
		position: fixed;
        left: 50%;
		top: 50%;
		width: calc(100vw - 4em);
		max-width: 90%;
		max-height: calc(100vh - 6em);
		overflow: auto;
		transform: translate(-50%,-50%);
		/* padding: 1em; */
		border-radius: 0.2em;
		background: white;
        z-index: 10001;
	}

	button {
		display: block;
	}

	.frontpageengine-modal-title {
		padding: 1em;
	}

	.frontpageengine-modal-footer {
		margin-top: 1em;		
	}
</style>