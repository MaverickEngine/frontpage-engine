import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
// import resolve from '@rollup/plugin-node-resolve';
// import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import scss from 'rollup-plugin-scss'
import css from 'rollup-plugin-css-only';
import preprocess from 'svelte-preprocess';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import strip from '@rollup/plugin-strip';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';

const production = !process.env.ROLLUP_WATCH;
const test = process.env.NODE_ENV === 'test';
const dev = process.env.NODE_ENV === 'development';

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

const pkg = require('./package.json');
let config;
if (test) {
	config = {
		plugins: [
			nodeResolve({
				browser: true,
			}),
			commonjs(),
			json()
		]
	}
} else {
	config = [
		{
			input: "src/frontpage_engine.js",
			output: [
				{
					sourcemap: true,
					format: 'iife',
					name: "frontpage_engine",
					file: "dist/frontpage_engine.dev.js"
				},
			],
			plugins: [
				svelte({
					emitCss: false,
					preprocess: preprocess(),
				}),
				scss({ fileName: 'bundle.css' }),
				css({ output: "frontpage_engine.css" }),
				nodeResolve({
					browser: true,
				}),
				replace({
					'process.env.NODE_ENV': JSON.stringify('development'),
					'process.env.VERSION': JSON.stringify(pkg.version),
				}),
				typescript(),
				commonjs(),
				json(),
				!production && serve(),
			]
		},
		{
			input: "src/frontpage_engine.js",
			output: [
				{
					sourcemap: true,
					format: 'iife',
					name: "frontpage_engine",
					file: "dist/frontpage_engine.js"
				},
			],
			plugins: [
				svelte({
					emitCss: false,
					preprocess: preprocess(),
				}),
				scss({ fileName: 'bundle.css', outputStyle: 'compressed' }),
				css({ output: "frontpage_engine.css" }),
				nodeResolve({
					browser: true,
				}),
				replace({
					'process.env.NODE_ENV': JSON.stringify('production'),
					'process.env.VERSION': JSON.stringify(pkg.version),
				}),
				typescript(),
				commonjs(),
				json(),
				!production && serve(),
				production && terser() && strip()
			]
		},
	];
}

export default config;
