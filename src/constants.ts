/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as KnockoutModule from "knockout";

// Data keys for storing metadata on DOM elements
export const ITEMKEY = "ko_sortItem";
export const INDEXKEY = "ko_sourceIndex";
export const LISTKEY = "ko_sortList";
export const PARENTKEY = "ko_parentList";
export const DRAGKEY = "ko_dragItem";

// Utility functions bound to ko and jQuery
export let unwrap: (value: any) => any;
export let dataGet: (node: Node, key: string) => any;
export let dataSet: (node: Node, key: string, value: any) => void;
export let version: string | undefined;
export let hasNestedSortableFix: boolean;

// Initialize the constants that depend on ko and $
export function initializeConstants(ko: typeof KnockoutModule, $: JQueryStatic): void {
	unwrap = ko.utils.unwrapObservable;
	dataGet = ko.utils.domData.get;
	dataSet = ko.utils.domData.set;
	version = $.ui && $.ui.version;
	//1.8.24 included a fix for how events were triggered in nested sortables. indexOf checks will fail if version starts with that value (0 vs. -1)
	hasNestedSortableFix =
		!!version &&
		!!version.indexOf("1.6.") &&
		!!version.indexOf("1.7.") &&
		(!!version.indexOf("1.8.") || version === "1.8.24");
}
