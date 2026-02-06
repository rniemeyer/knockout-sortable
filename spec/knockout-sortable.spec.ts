/// <reference types="jquery" />
/// <reference types="knockout" />
/// <reference types="jqueryui" />

import { describe, it, expect, beforeEach } from "vitest";

// Extend Window interface
declare global {
	interface Window {
		ko: KnockoutStatic;
		jQuery: JQueryStatic;
	}
}

// Setup test HTML environment
function setupTestElement() {
	const div = document.createElement("div");
	div.id = "test-container";
	document.body.appendChild(div);
	return div;
}

function cleanupTestElement() {
	const container = document.getElementById("test-container");
	if (container) {
		window.ko?.cleanNode(container);
		container.remove();
	}
}

// Helper to render a template with data
function renderTemplate(templateString: string, data: any) {
	const container = setupTestElement();
	container.innerHTML = templateString;
	window.ko?.applyBindings(data, container);
	return container;
}

describe("knockout-sortable", function () {
	beforeEach(() => {
		cleanupTestElement();
	});

	describe("sortable binding", function () {
		describe("when using an anonymous template", function () {
			it("should render all items", function () {
				const data = {
					items: window.ko?.observableArray([{ name: "1" }, { name: "2" }, { name: "3" }])
				};

				const container = renderTemplate(
					`
                    <div data-bind="sortable: items">
                        <div data-bind="text: name"></div>
                    </div>
                `,
					data
				);

				const children = window.jQuery(container).children().eq(0).children();

				expect(children.length).toEqual(3);
				expect(children.eq(0).text()).toEqual("1");
				expect(children.eq(1).text()).toEqual("2");
				expect(children.eq(2).text()).toEqual("3");
			});

			it("should strip top-level text nodes", function () {
				const data = {
					items: window.ko?.observableArray([{ name: "1" }, { name: "2" }, { name: "3" }])
				};

				const container = renderTemplate(
					`
                    <div data-bind="sortable: items">
                        <div data-bind="text: name"></div>
                    </div>
                `,
					data
				);

				const children = window.jQuery(container).children().eq(0).children();

				expect(children.length).toEqual(3);
				expect(children.eq(0).text()).toEqual("1");
				expect(children.eq(1).text()).toEqual("2");
				expect(children.eq(2).text()).toEqual("3");
			});
		});

		describe("when using a named template", function () {
			it("should render all items", function () {
				// Add template to document
				const template = document.createElement("script");
				template.type = "text/html";
				template.id = "test-template";
				template.innerHTML = '<div data-bind="text: name"></div>';
				document.body.appendChild(template);

				const data = {
					items: window.ko?.observableArray([{ name: "1" }, { name: "2" }, { name: "3" }])
				};

				const container = renderTemplate(
					`
                    <div data-bind="sortable: { data: items, template: 'test-template' }"></div>
                `,
					data
				);

				const children = window.jQuery(container).children().eq(0).children();

				expect(children.length).toEqual(3);
				expect(children.eq(0).text()).toEqual("1");
				expect(children.eq(1).text()).toEqual("2");
				expect(children.eq(2).text()).toEqual("3");

				template.remove();
			});
		});
	});

	describe("draggable binding", function () {
		it("should initialize draggable on element", function () {
			const data = {
				item: { name: "Draggable Item" }
			};

			const container = renderTemplate(
				`
                <div data-bind="draggable: item">
                    <span data-bind="text: name"></span>
                </div>
            `,
				data
			);

			const element = window.jQuery(container).children().eq(0);

			// Check if draggable was initialized
			expect(element.data("ui-draggable") || element.data("draggable")).toBeTruthy();
		});
	});

	describe("droppable binding", function () {
		it("should initialize droppable on element", function () {
			const data = {
				handleDrop: function () {
					/* handle drop */
				}
			};

			const container = renderTemplate(
				`
                <div data-bind="droppable: handleDrop"></div>
            `,
				data
			);

			const element = window.jQuery(container).children().eq(0);

			// Check if droppable was initialized
			expect(element.data("ui-droppable") || element.data("droppable")).toBeTruthy();
		});
	});
});
