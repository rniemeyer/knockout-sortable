/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as KnockoutModule from "knockout";
import type { DroppableOptions, DroppableBinding } from "../types";
import { DRAGKEY, ITEMKEY, unwrap, dataGet } from "../constants";

let ko: typeof KnockoutModule;
let $: JQueryStatic;

export function initializeDroppableBinding(
	koInstance: typeof KnockoutModule,
	jQueryInstance: JQueryStatic
): void {
	ko = koInstance;
	$ = jQueryInstance;
}

// Simple Droppable Implementation
// binding that updates (function or observable)
export const droppableBinding: DroppableBinding = {
	init: function (element: Element, valueAccessor: () => any) {
		let value = unwrap(valueAccessor()) || ({} as DroppableOptions);
		const options = value.options || {};
		const droppableOptions = ko.utils.extend({}, ko.bindingHandlers.droppable.options);
		const isEnabled =
			value.isEnabled !== undefined
				? value.isEnabled
				: ko.bindingHandlers.droppable.isEnabled;

		//override global options with override options passed in
		ko.utils.extend(droppableOptions, options);

		//get reference to drop method
		value = ("data" in value ? value.data : valueAccessor()) as any;

		//set drop method
		(droppableOptions as any).drop = function (
			_event: Event,
			ui: JQueryUI.DroppableEventUIParam
		) {
			const droppedItem =
				dataGet(ui.draggable[0], DRAGKEY) || dataGet(ui.draggable[0], ITEMKEY);
			(value as any)(droppedItem);
		};

		//initialize droppable
		$(element).droppable(droppableOptions);

		//handle enabling/disabling droppable
		if (isEnabled !== undefined) {
			ko.computed({
				read: function () {
					$(element).droppable(unwrap(isEnabled) ? "enable" : "disable");
				},
				disposeWhenNodeIsRemoved: element
			});
		}

		//handle disposal
		ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
			const $element = $(element);
			if ($element.data("ui-droppable") || $element.data("droppable")) {
				$element.droppable("destroy");
			}
		});
	},
	options: {
		accept: "*"
	}
};
