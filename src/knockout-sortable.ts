/* eslint-disable @typescript-eslint/no-explicit-any */
import * as ko from "knockout";
import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import "jquery-ui/ui/widgets/draggable";
import "jquery-ui/ui/widgets/droppable";

import { initializeConstants } from "./constants";
import { initializeUtils } from "./utils";
import { initializeSortableBinding, sortableBinding } from "./bindings/sortable";
import { initializeDraggableBinding, draggableBinding } from "./bindings/draggable";
import { initializeDroppableBinding, droppableBinding } from "./bindings/droppable";

// Re-export types for external use
export type {
	MoveArgument,
	SortableOptions,
	DraggableOptions,
	DroppableOptions,
	SortableBinding,
	DraggableBinding,
	DroppableBinding
} from "./types";

// Initialize all modules with ko and $ instances
initializeConstants(ko, $);
initializeUtils(ko, $);
initializeSortableBinding(ko, $);
initializeDraggableBinding(ko, $);
initializeDroppableBinding(ko, $);

// Register binding handlers
ko.bindingHandlers.sortable = sortableBinding;
ko.bindingHandlers.draggable = draggableBinding;
ko.bindingHandlers.droppable = droppableBinding;

// Global type augmentation to extend Knockout's BindingHandlers interface
// eslint-disable-next-line @typescript-eslint/no-namespace, @typescript-eslint/prefer-namespace-keyword
declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace KnockoutBindingHandlers {
		interface sortable {
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
		}
		interface draggable {
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
		}
		interface droppable {
			init(element: Element, valueAccessor: () => any): void;
			options: any;
			isEnabled?: any;
		}
	}
}
