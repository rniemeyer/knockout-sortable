import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const year = new Date().getFullYear();
const banner = `// knockout-sortable ${pkg.version} | (c) ${year} ${pkg.author} | http://www.opensource.org/licenses/mit-license`;

export default [
	// Main build (UMD and ESM)
	{
		input: "src/knockout-sortable.ts",
		output: [
			{
				file: "build/knockout-sortable.js",
				format: "umd",
				name: "knockoutSortable",
				globals: {
					knockout: "ko",
					jquery: "jQuery"
				},
				banner: banner,
				sourcemap: true
			},
			{
				file: "build/knockout-sortable.esm.js",
				format: "es",
				banner: banner,
				sourcemap: true
			}
		],
		external: [
			"knockout",
			"jquery",
			"jquery-ui/ui/widgets/sortable",
			"jquery-ui/ui/widgets/draggable",
			"jquery-ui/ui/widgets/droppable"
		],
		plugins: [
			resolve(),
			typescript({
				tsconfig: "./tsconfig.json",
				declaration: false,
				declarationMap: false
			})
		]
	},
	// Minified UMD build
	{
		input: "src/knockout-sortable.ts",
		output: {
			file: "build/knockout-sortable.min.js",
			format: "umd",
			name: "knockoutSortable",
			globals: {
				knockout: "ko",
				jquery: "jQuery"
			},
			banner: banner,
			sourcemap: true
		},
		external: [
			"knockout",
			"jquery",
			"jquery-ui/ui/widgets/sortable",
			"jquery-ui/ui/widgets/draggable",
			"jquery-ui/ui/widgets/droppable"
		],
		plugins: [
			resolve(),
			typescript({
				tsconfig: "./tsconfig.json",
				declaration: false,
				declarationMap: false
			}),
			terser({
				format: {
					comments: /^!/,
					preamble: banner
				}
			})
		]
	},
	// Type definitions bundle
	{
		input: "src/knockout-sortable.ts",
		output: {
			file: "build/knockout-sortable.d.ts",
			format: "es"
		},
		external: [
			"knockout",
			"jquery",
			"jquery-ui/ui/widgets/sortable",
			"jquery-ui/ui/widgets/draggable",
			"jquery-ui/ui/widgets/droppable"
		],
		plugins: [dts()]
	}
];
