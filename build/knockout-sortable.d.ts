declare module "knockout" {
    interface BindingHandlers {
        sortable: {
            init(element: Element, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext): {
                controlsDescendantBindings: boolean;
            };
            update(element: Element, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext): void;
            connectClass: string;
            allowDrop: boolean;
            afterMove: ((arg: any, event: Event, ui: any) => void) | null;
            beforeMove: ((arg: any, event: Event, ui: any) => void) | null;
            options: any;
        };
        draggable: {
            init(element: Element, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext): any;
            update(element: Element, valueAccessor: () => any, allBindingsAccessor: KnockoutAllBindingsAccessor, viewModel: any, bindingContext: KnockoutBindingContext): any;
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
