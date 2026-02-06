// Setup function to load all required libraries
export async function loadLibraries(): Promise<void> {
	return new Promise<void>((resolve) => {
		// Load jQuery first
		const jqueryScript = document.createElement("script");
		jqueryScript.src = "/ext/jquery-3.7.1.min.js";

		jqueryScript.onload = () => {
			// Then load jQuery UI
			const jqueryUiScript = document.createElement("script");
			jqueryUiScript.src = "/ext/jquery-ui-1.13.2.min.js";

			jqueryUiScript.onload = () => {
				// Then load Knockout
				const koScript = document.createElement("script");
				koScript.src = "/ext/knockout-3.5.1.js";

				koScript.onload = () => {
					// Finally load knockout-sortable
					const sortableScript = document.createElement("script");
					sortableScript.src = "/build/knockout-sortable.js";

					sortableScript.onload = () => {
						// Small delay to ensure everything is initialized
						setTimeout(resolve, 50);
					};

					document.head.appendChild(sortableScript);
				};

				document.head.appendChild(koScript);
			};

			document.head.appendChild(jqueryUiScript);
		};

		document.head.appendChild(jqueryScript);
	});
}

// Load libraries before tests run
await loadLibraries();

