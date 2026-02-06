/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as KnockoutModule from "knockout";
import type { DraggableOptions, DraggableBinding } from "../types";
import { DRAGKEY, unwrap, dataSet } from "../constants";
import { prepareTemplateOptions } from "../utils";

let ko: typeof KnockoutModule;
let $: JQueryStatic;

export function initializeDraggableBinding(
	koInstance: typeof KnockoutModule,
	jQueryInstance: JQueryStatic
): void {
	ko = koInstance;
	$ = jQueryInstance;
}

//create a draggable that is appropriate for dropping into a sortable
export const draggableBinding: DraggableBinding = {
	init: function (
		element: Element,
		valueAccessor: () => any,
		allBindingsAccessor: KnockoutAllBindingsAccessor,
		data: any,
		context: KnockoutBindingContext
	) {
		let value = unwrap(valueAccessor()) || ({} as DraggableOptions);
		const options = value.options || {};
		const draggableOptions = ko.utils.extend({}, ko.bindingHandlers.draggable.options);
		const templateOptions = prepareTemplateOptions(valueAccessor, "data");
		const connectClass = value.connectClass || ko.bindingHandlers.draggable.connectClass;
		const isEnabled =
			value.isEnabled !== undefined
				? value.isEnabled
				: ko.bindingHandlers.draggable.isEnabled;

		value = "data" in value ? value.data : (value as any);

		//set meta-data
		dataSet(element, DRAGKEY, value);

		//override global options with override options passed in
		ko.utils.extend(draggableOptions, options);

		//setup connection to a sortable
		(draggableOptions as any).connectToSortable = connectClass ? "." + connectClass : false;

		//initialize draggable
		$(element).draggable(draggableOptions);

		//handle enabling/disabling sorting
		if (isEnabled !== undefined) {
			ko.computed({
				read: function () {
					$(element).draggable(unwrap(isEnabled) ? "enable" : "disable");
				},
				disposeWhenNodeIsRemoved: element
			});
		}

		//handle disposal
		ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
			const $element = $(element);
			if ($element.data("ui-draggable") || $element.data("draggable")) {
				$element.draggable("destroy");
			}
		});

		return ko.bindingHandlers.template.init(
			element,
			function () {
				return templateOptions;
			},
			allBindingsAccessor,
			data,
			context
		);
	},
	update: function (
		element: Element,
		valueAccessor: () => any,
		allBindingsAccessor: KnockoutAllBindingsAccessor,
		data: any,
		context: KnockoutBindingContext
	) {
		const templateOptions = prepareTemplateOptions(valueAccessor, "data");

		return ko.bindingHandlers.template.update(
			element,
			function () {
				return templateOptions;
			},
			allBindingsAccessor,
			data,
			context
		);
	},
	connectClass: "ko_container",
	options: {
		helper: "clone"
	}
};
