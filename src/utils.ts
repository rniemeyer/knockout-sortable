/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as KnockoutModule from "knockout";
import { ITEMKEY, PARENTKEY, unwrap, dataSet } from "./constants";

let ko: typeof KnockoutModule;
let $: JQueryStatic;

export function initializeUtils(koInstance: typeof KnockoutModule, jQueryInstance: JQueryStatic): void {
	ko = koInstance;
	$ = jQueryInstance;
}

//internal afterRender that adds meta-data to children
export const addMetaDataAfterRender = function (elements: Element[], data: any) {
	ko.utils.arrayForEach(elements, function (element) {
		if (element.nodeType === 1) {
			dataSet(element, ITEMKEY, data);
			dataSet(element, PARENTKEY, ko.utils.domData.get(element.parentNode, "ko_sortList"));
		}
	});
};

//prepare the proper options for the template binding
export const prepareTemplateOptions = function (valueAccessor: () => any, dataName: string): any {
	const result: any = {};
	let options: any = {};
	let actualAfterRender: any;

	//build our options to pass to the template engine
	if (ko.utils.peekObservable(valueAccessor()).data) {
		options = unwrap(valueAccessor() || {});
		result[dataName] = options.data;
		if (Object.prototype.hasOwnProperty.call(options, "template")) {
			result.name = options.template;
		}
	} else {
		result[dataName] = valueAccessor();
	}

	ko.utils.arrayForEach(
		[
			"afterAdd",
			"afterRender",
			"as",
			"beforeRemove",
			"includeDestroyed",
			"templateEngine",
			"templateOptions",
			"nodes"
		],
		function (option: string) {
			if (Object.prototype.hasOwnProperty.call(options, option)) {
				result[option] = options[option];
			} else if (
				Object.prototype.hasOwnProperty.call(ko.bindingHandlers.sortable, option)
			) {
				result[option] = (ko.bindingHandlers.sortable as any)[option];
			}
		}
	);

	//use an afterRender function to add meta-data
	if (dataName === "foreach") {
		if (result.afterRender) {
			//wrap the existing function, if it was passed
			actualAfterRender = result.afterRender;
			result.afterRender = function (element: Element[], data: any) {
				addMetaDataAfterRender.call(data, element, data);
				actualAfterRender.call(data, element, data);
			};
		} else {
			result.afterRender = addMetaDataAfterRender;
		}
	}

	//return options to pass to the template binding
	return result;
};

export const updateIndexFromDestroyedItems = function (
	index: number,
	items: KnockoutObservableArray<any> | null
): number {
	const unwrapped = unwrap(items);

	if (unwrapped) {
		for (let i = 0; i <= index; i++) {
			//add one for every destroyed item we find before the targetIndex in the target array
			if (unwrapped[i] && unwrap(unwrapped[i]._destroy)) {
				index++;
			}
		}
	}

	return index;
};

//remove problematic leading/trailing whitespace from templates
export const stripTemplateWhitespace = function (element: Element, name?: string) {
	let templateSource: any;
	let templateElement: HTMLElement | null;

	//process named templates
	if (name) {
		templateElement = document.getElementById(name);
		if (templateElement) {
			templateSource = new ko.templateSources.domElement(templateElement);
			templateSource.text(templateSource.text().trim());
		}
	} else {
		//remove leading/trailing non-elements from anonymous templates
		$(element)
			.contents()
			.each(function () {
				if (this && this.nodeType !== 1) {
					element.removeChild(this);
				}
			});
	}
};
