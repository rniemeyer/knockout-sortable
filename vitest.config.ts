import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		browser: {
			enabled: true,
			name: "chromium",
			provider: "playwright",
			headless: true
		},
		setupFiles: ["./spec/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/**",
				"build/**",
				"dist/**",
				"examples/**",
				"ext/**",
				"**/*.config.js",
				"**/*.config.ts"
			]
		},
		globals: true
	}
});
