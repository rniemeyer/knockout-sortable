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
    afterMove: ((arg: MoveArgument, event: Event, ui: JQueryUI.SortableUIParams) => void) | null;
    beforeMove: ((arg: MoveArgument, event: Event, ui: JQueryUI.SortableUIParams) => void) | null;
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

declare global {
    namespace KnockoutBindingHandlers {
        interface sortable {
            init(element: Element, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext): {
                controlsDescendantBindings: boolean;
            };
            update(element: Element, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext): void;
            connectClass: string;
            allowDrop: boolean;
            afterMove: ((arg: any, event: Event, ui: any) => void) | null;
            beforeMove: ((arg: any, event: Event, ui: any) => void) | null;
            options: any;
        }
        interface draggable {
            init(element: Element, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext): any;
            update(element: Element, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext): any;
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

export type { DraggableBinding, DraggableOptions, DroppableBinding, DroppableOptions, MoveArgument, SortableBinding, SortableOptions };
