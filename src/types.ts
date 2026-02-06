/* eslint-disable @typescript-eslint/no-explicit-any */

export interface MoveArgument {
	item: any;
	sourceParent: KnockoutObservableArray<any> | null;
	sourceParentNode: Element;
	sourceIndex: number;
	targetParent: KnockoutObservableArray<any>;
	targetIndex: number;
	cancelDrop: boolean;
}

export interface SortableOptions {
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

export interface DraggableOptions {
	data?: any;
	options?: JQueryUI.DraggableOptions;
	connectClass?: string;
	isEnabled?: KnockoutObservable<boolean> | boolean;
	clone?: () => any;
	template?: string;
}

export interface DroppableOptions {
	data?: (item: any) => void;
	options?: JQueryUI.DroppableOptions;
	isEnabled?: KnockoutObservable<boolean> | boolean;
}

export interface SortableBinding extends KnockoutBindingHandler {
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

export interface DraggableBinding extends KnockoutBindingHandler {
	connectClass: string;
	options: JQueryUI.DraggableOptions;
	isEnabled?: KnockoutObservable<boolean> | boolean;
}

export interface DroppableBinding extends KnockoutBindingHandler {
	options: JQueryUI.DroppableOptions;
	isEnabled?: KnockoutObservable<boolean> | boolean;
}
