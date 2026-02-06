/* eslint-disable @typescript-eslint/no-explicit-any */

// UMD global declarations
declare const define: {
	(dependencies: string[], factory: (...args: any[]) => void): void;
	amd: any;
};

declare const require: (module: string) => any;
declare const exports: any;
declare const module: { exports: any };

// Extend Window interface for global jQuery and Knockout
interface WindowWithGlobals extends Window {
	ko: KnockoutStatic;
	jQuery: JQueryStatic;
}

(function (factory: (ko: KnockoutStatic, $: JQueryStatic) => void) {
	if (typeof define === "function" && define.amd) {
		// AMD anonymous module
		define([
			"knockout",
			"jquery",
			"jquery-ui/ui/widgets/sortable",
			"jquery-ui/ui/widgets/draggable",
			"jquery-ui/ui/widgets/droppable"
		], factory);
	} else if (
		typeof require === "function" &&
		typeof exports === "object" &&
		typeof module === "object"
	) {
		// CommonJS module
		const ko = require("knockout");
		const jQuery = require("jquery");
		require("jquery-ui/ui/widgets/sortable");
		require("jquery-ui/ui/widgets/draggable");
		require("jquery-ui/ui/widgets/droppable");
		factory(ko, jQuery);
	} else {
		// No module loader (plain <script> tag) - put directly in global namespace
		const w = window as unknown as WindowWithGlobals;
		factory(w.ko, w.jQuery);
	}
})(function (ko: KnockoutStatic, $: JQueryStatic) {
	const ITEMKEY = "ko_sortItem";
	const INDEXKEY = "ko_sourceIndex";
	const LISTKEY = "ko_sortList";
	const PARENTKEY = "ko_parentList";
	const DRAGKEY = "ko_dragItem";
	const unwrap = ko.utils.unwrapObservable;
	const dataGet = ko.utils.domData.get;
	const dataSet = ko.utils.domData.set;
	const version = $.ui && $.ui.version;
	//1.8.24 included a fix for how events were triggered in nested sortables. indexOf checks will fail if version starts with that value (0 vs. -1)
	const hasNestedSortableFix =
		version &&
		version.indexOf("1.6.") &&
		version.indexOf("1.7.") &&
		(version.indexOf("1.8.") || version === "1.8.24");

	interface MoveArgument {
		item: any;
		sourceParent: KnockoutObservableArray<any> | null;
		sourceParentNode: Element;
		sourceIndex: number;
		targetParent: KnockoutObservableArray<any>;
		targetIndex: number;
		cancelDrop: boolean;
	}

	interface SortableOptions {
		data?: KnockoutObservableArray<any> | KnockoutObservable<any>;
		template?: string;
		options?: JQueryUI.SortableOptions;
		beforeMove?: (arg: MoveArgument, event: Event, ui: JQueryUI.SortableUIParams) => void;
		afterMove?: (arg: MoveArgument, event: Event, ui: JQueryUI.SortableUIParams) => void;
		afterAdd?: (element: Element, data: any) => void;
		isEnabled?: KnockoutObservable<boolean> | boolean;
		allowDrop?: KnockoutObservable<boolean> | boolean | ((data: any) => boolean);
		connectClass?: string;
		dragged?: (item: any, event: Event, ui: JQueryUI.SortableUIParams) => any;
		strategyMove?: boolean;
		afterRender?: (elements: Element[], data: any) => void;
		beforeRemove?: (elements: Element[], data: any) => void;
		as?: string;
		includeDestroyed?: boolean;
		templateEngine?: any;
		templateOptions?: any;
		nodes?: any;
	}

	interface DraggableOptions {
		data?: any;
		options?: JQueryUI.DraggableOptions;
		connectClass?: string;
		isEnabled?: KnockoutObservable<boolean> | boolean;
		clone?: () => any;
		template?: string;
	}

	interface DroppableOptions {
		data?: (item: any) => void;
		options?: JQueryUI.DroppableOptions;
		isEnabled?: KnockoutObservable<boolean> | boolean;
	}

	interface SortableBinding extends KnockoutBindingHandler {
		connectClass: string;
		allowDrop: boolean;
		afterMove:
			| ((arg: MoveArgument, event: Event, ui: JQueryUI.SortableUIParams) => void)
			| null;
		beforeMove:
			| ((arg: MoveArgument, event: Event, ui: JQueryUI.SortableUIParams) => void)
			| null;
		options: JQueryUI.SortableOptions;
	}

	interface DraggableBinding extends KnockoutBindingHandler {
		connectClass: string;
		options: JQueryUI.DraggableOptions;
		isEnabled?: KnockoutObservable<boolean> | boolean;
	}

	interface DroppableBinding extends KnockoutBindingHandler {
		options: JQueryUI.DroppableOptions;
		isEnabled?: KnockoutObservable<boolean> | boolean;
	}

	//internal afterRender that adds meta-data to children
	const addMetaDataAfterRender = function (elements: Element[], data: any) {
		ko.utils.arrayForEach(elements, function (element) {
			if (element.nodeType === 1) {
				dataSet(element, ITEMKEY, data);
				dataSet(element, PARENTKEY, dataGet(element.parentNode, LISTKEY));
			}
		});
	};

	//prepare the proper options for the template binding
	const prepareTemplateOptions = function (valueAccessor: () => any, dataName: string): any {
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

	const updateIndexFromDestroyedItems = function (
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
	const stripTemplateWhitespace = function (element: Element, name?: string) {
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

	//connect items with observableArrays
	ko.bindingHandlers.sortable = {
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
	} as SortableBinding;

	//create a draggable that is appropriate for dropping into a sortable
	ko.bindingHandlers.draggable = {
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
		connectClass: ko.bindingHandlers.sortable.connectClass,
		options: {
			helper: "clone"
		}
	} as DraggableBinding;

	// Simple Droppable Implementation
	// binding that updates (function or observable)
	ko.bindingHandlers.droppable = {
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
	} as DroppableBinding;
});

// Module augmentation to extend Knockout's BindingHandlers interface
declare module "knockout" {
	interface BindingHandlers {
		sortable: {
			init(
				element: Element,
				valueAccessor: () => any,
				allBindingsAccessor: KnockoutAllBindingsAccessor,
				viewModel: any,
				bindingContext: KnockoutBindingContext
			): { controlsDescendantBindings: boolean };
			update(
				element: Element,
				valueAccessor: () => any,
				allBindingsAccessor: KnockoutAllBindingsAccessor,
				viewModel: any,
				bindingContext: KnockoutBindingContext
			): void;
			connectClass: string;
			allowDrop: boolean;
			afterMove: ((arg: any, event: Event, ui: any) => void) | null;
			beforeMove: ((arg: any, event: Event, ui: any) => void) | null;
			options: any;
		};
		draggable: {
			init(
				element: Element,
				valueAccessor: () => any,
				allBindingsAccessor: KnockoutAllBindingsAccessor,
				viewModel: any,
				bindingContext: KnockoutBindingContext
			): any;
			update(
				element: Element,
				valueAccessor: () => any,
				allBindingsAccessor: KnockoutAllBindingsAccessor,
				viewModel: any,
				bindingContext: KnockoutBindingContext
			): any;
			connectClass: string;
			options: any;
			isEnabled?: any;
		};
		droppable: {
			init(element: Element, valueAccessor: () => any): void;
			options: any;
			isEnabled?: any;
		};
	}
}
