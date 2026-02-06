/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as KnockoutModule from "knockout";
import type { SortableOptions, SortableBinding, MoveArgument } from "../types";
import {
	ITEMKEY,
	INDEXKEY,
	LISTKEY,
	PARENTKEY,
	DRAGKEY,
	unwrap,
	dataGet,
	dataSet,
	hasNestedSortableFix
} from "../constants";
import {
	prepareTemplateOptions,
	updateIndexFromDestroyedItems,
	stripTemplateWhitespace
} from "../utils";

let ko: typeof KnockoutModule;
let $: JQueryStatic;

export function initializeSortableBinding(
	koInstance: typeof KnockoutModule,
	jQueryInstance: JQueryStatic
): void {
	ko = koInstance;
	$ = jQueryInstance;
}

//connect items with observableArrays
export const sortableBinding: SortableBinding = {
	init: function (
		element: Element,
		valueAccessor: () => any,
		allBindingsAccessor: KnockoutAllBindingsAccessor,
		data: any,
		context: KnockoutBindingContext
	) {
		const $element = $(element);
		const value = unwrap(valueAccessor()) || ({} as SortableOptions);
		const templateOptions = prepareTemplateOptions(valueAccessor, "foreach");
		const sortable: any = {};

		stripTemplateWhitespace(element, templateOptions.name);

		//build a new object that has the global options with overrides from the binding
		$.extend(true, sortable, ko.bindingHandlers.sortable);
		if (value.options && sortable.options) {
			ko.utils.extend(sortable.options, value.options);
			delete value.options;
		}
		ko.utils.extend(sortable, value);

		//if allowDrop is an observable or a function, then execute it in a computed observable
		if (
			sortable.connectClass &&
			(ko.isObservable(sortable.allowDrop) || typeof sortable.allowDrop == "function")
		) {
			ko.computed(
				{
					read: function () {
						const value = unwrap(sortable.allowDrop);
						const shouldAdd =
							typeof value == "function"
								? value.call(this, templateOptions.foreach)
								: value;
						ko.utils.toggleDomNodeCssClass(
							element,
							sortable.connectClass,
							shouldAdd
						);
					},
					disposeWhenNodeIsRemoved: element
				},
				this
			);
		} else {
			ko.utils.toggleDomNodeCssClass(element, sortable.connectClass, sortable.allowDrop);
		}

		//wrap the template binding
		ko.bindingHandlers.template.init(
			element,
			function () {
				return templateOptions;
			},
			allBindingsAccessor,
			data,
			context
		);

		//keep a reference to start/update functions that might have been passed in
		const startActual = sortable.options.start;
		const updateActual = sortable.options.update;

		//ensure draggable table row cells maintain their width while dragging (unless a helper is provided)
		if (!sortable.options.helper) {
			sortable.options.helper = function (_e: Event, ui: JQuery) {
				if (ui.is("tr")) {
					ui.children().each(function () {
						$(this).width($(this).width() as number);
					});
				}
				return ui;
			};
		}

		//initialize sortable binding after template binding has rendered in update function
		const createTimeout = setTimeout(function () {
			let dragItem: any;
			const originalReceive = sortable.options.receive;

			$element.sortable(
				ko.utils.extend(sortable.options, {
					start: function (
						event: Event,
						ui: JQueryUI.SortableUIParams,
						...args: any[]
					) {
						//track original index
						const el = ui.item[0];
						dataSet(
							el,
							INDEXKEY,
							ko.utils.arrayIndexOf(
								ui.item.parent().children().get() as HTMLElement[],
								el
							)
						);

						//make sure that fields have a chance to update model
						ui.item.find("input:focus").change();
						if (startActual) {
							startActual.call(this, event, ui, ...args);
						}
					},
					receive: function (event: Event, ui: JQueryUI.SortableUIParams) {
						//optionally apply an existing receive handler
						if (typeof originalReceive === "function") {
							originalReceive.call(this, event, ui);
						}

						dragItem = dataGet(ui.item[0], DRAGKEY);
						if (dragItem) {
							//copy the model item, if a clone option is provided
							if (dragItem.clone) {
								dragItem = dragItem.clone();
							}

							//configure a handler to potentially manipulate item before drop
							if (sortable.dragged) {
								dragItem =
									sortable.dragged.call(this, dragItem, event, ui) ||
									dragItem;
							}
						}
					},
					update: function (event: Event, ui: JQueryUI.SortableUIParams) {
						let sourceParent: KnockoutObservableArray<any> | null;
						let targetParent: KnockoutObservableArray<any>;
						let sourceIndex: number;
						let targetIndex: number;
						let arg: MoveArgument | null;
						const el = ui.item[0];
						const parentEl = ui.item.parent()[0];
						const item = dataGet(el, ITEMKEY) || dragItem;

						if (!item) {
							$(el).remove();
						}
						dragItem = null;

						//make sure that moves only run once, as update fires on multiple containers
						if (
							(item && this === parentEl) ||
							(!hasNestedSortableFix && $.contains(this, parentEl))
						) {
							//identify parents
							sourceParent = dataGet(el, PARENTKEY);
							sourceIndex = dataGet(el, INDEXKEY);
							targetParent = dataGet(el.parentNode, LISTKEY);
							targetIndex = ko.utils.arrayIndexOf(
								ui.item.parent().children().get() as HTMLElement[],
								el
							);

							//take destroyed items into consideration
							if (!templateOptions.includeDestroyed) {
								sourceIndex = updateIndexFromDestroyedItems(
									sourceIndex,
									sourceParent
								);
								targetIndex = updateIndexFromDestroyedItems(
									targetIndex,
									targetParent
								);
							}

							//build up args for the callbacks
							if (sortable.beforeMove || sortable.afterMove) {
								arg = {
									item: item,
									sourceParent: sourceParent,
									sourceParentNode:
										(sourceParent && (ui.sender as any)) || el.parentNode,
									sourceIndex: sourceIndex,
									targetParent: targetParent,
									targetIndex: targetIndex,
									cancelDrop: false
								};

								//execute the configured callback prior to actually moving items
								if (sortable.beforeMove) {
									sortable.beforeMove.call(this, arg, event, ui);
								}
							}

							//call cancel on the correct list, so KO can take care of DOM manipulation
							if (sourceParent) {
								$(
									sourceParent === targetParent ? this : ui.sender || this
								).sortable("cancel");
							}
							//for a draggable item just remove the element
							else {
								$(el).remove();
							}

							//if beforeMove told us to cancel, then we are done
							if (arg && arg.cancelDrop) {
								return;
							}

							//if the strategy option is unset or false, employ the order strategy involving removal and insertion of items
							if (
								!Object.prototype.hasOwnProperty.call(
									sortable,
									"strategyMove"
								) ||
								sortable.strategyMove === false
							) {
								//do the actual move
								if (targetIndex >= 0) {
									if (sourceParent) {
										sourceParent.splice(sourceIndex, 1);

										//if using deferred updates plugin, force updates
										if ((ko as any).processAllDeferredBindingUpdates) {
											(ko as any).processAllDeferredBindingUpdates();
										}

										//if using deferred updates on knockout 3.4, force updates
										if (ko.options && (ko.options as any).deferUpdates) {
											(ko.tasks as any).runEarly();
										}
									}

									targetParent.splice(targetIndex, 0, item);
								}

								//rendering is handled by manipulating the observableArray; ignore dropped element
								dataSet(el, ITEMKEY, null);
							} else {
								//employ the strategy of moving items
								if (targetIndex >= 0) {
									if (sourceParent) {
										if (sourceParent !== targetParent) {
											// moving from one list to another

											sourceParent.splice(sourceIndex, 1);
											targetParent.splice(targetIndex, 0, item);

											//rendering is handled by manipulating the observableArray; ignore dropped element
											dataSet(el, ITEMKEY, null);
											ui.item.remove();
										} else {
											// moving within same list
											const underlyingList = unwrap(sourceParent);

											// notify 'beforeChange' subscribers
											if (sourceParent.valueWillMutate) {
												sourceParent.valueWillMutate();
											}

											// move from source index ...
											underlyingList.splice(sourceIndex, 1);
											// ... to target index
											underlyingList.splice(targetIndex, 0, item);

											// notify subscribers
											if (sourceParent.valueHasMutated) {
												sourceParent.valueHasMutated();
											}
										}
									} else {
										// drop new element from outside
										targetParent.splice(targetIndex, 0, item);

										//rendering is handled by manipulating the observableArray; ignore dropped element
										dataSet(el, ITEMKEY, null);
										ui.item.remove();
									}
								}
							}

							//if using deferred updates plugin, force updates
							if ((ko as any).processAllDeferredBindingUpdates) {
								(ko as any).processAllDeferredBindingUpdates();
							}

							//allow binding to accept a function to execute after moving the item
							if (sortable.afterMove) {
								sortable.afterMove.call(this, arg, event, ui);
							}
						}

						if (updateActual) {
							updateActual.call(this, event, ui);
						}
					},
					connectWith: sortable.connectClass ? "." + sortable.connectClass : false
				})
			);

			//handle enabling/disabling sorting
			if (sortable.isEnabled !== undefined) {
				ko.computed({
					read: function () {
						$element.sortable(unwrap(sortable.isEnabled) ? "enable" : "disable");
					},
					disposeWhenNodeIsRemoved: element
				});
			}
		}, 0);

		//handle disposal
		ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
			//only call destroy if sortable has been created
			if ($element.data("ui-sortable") || $element.data("sortable")) {
				$element.sortable("destroy");
			}

			ko.utils.toggleDomNodeCssClass(element, sortable.connectClass, false);

			//do not create the sortable if the element has been removed from DOM
			clearTimeout(createTimeout);
		});

		return { controlsDescendantBindings: true };
	},
	update: function (
		element: Element,
		valueAccessor: () => any,
		allBindingsAccessor: KnockoutAllBindingsAccessor,
		data: any,
		context: KnockoutBindingContext
	) {
		const templateOptions = prepareTemplateOptions(valueAccessor, "foreach");

		//attach meta-data
		dataSet(element, LISTKEY, templateOptions.foreach);

		//call template binding's update with correct options
		ko.bindingHandlers.template.update(
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
	allowDrop: true,
	afterMove: null,
	beforeMove: null,
	options: {}
};
