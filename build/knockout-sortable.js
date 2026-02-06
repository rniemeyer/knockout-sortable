// knockout-sortable 2.0.0 | (c) 2026 Ryan Niemeyer | http://www.opensource.org/licenses/mit-license
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('knockout'), require('jquery'), require('jquery-ui/ui/widgets/sortable'), require('jquery-ui/ui/widgets/draggable'), require('jquery-ui/ui/widgets/droppable')) :
    typeof define === 'function' && define.amd ? define(['knockout', 'jquery', 'jquery-ui/ui/widgets/sortable', 'jquery-ui/ui/widgets/draggable', 'jquery-ui/ui/widgets/droppable'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ko, global.jQuery));
})(this, (function (ko$4, $$4) { 'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return Object.freeze(n);
    }

    var ko__namespace = /*#__PURE__*/_interopNamespaceDefault(ko$4);

    // Data keys for storing metadata on DOM elements
    const ITEMKEY = "ko_sortItem";
    const INDEXKEY = "ko_sourceIndex";
    const LISTKEY = "ko_sortList";
    const PARENTKEY = "ko_parentList";
    const DRAGKEY = "ko_dragItem";
    // Utility functions bound to ko and jQuery
    let unwrap;
    let dataGet;
    let dataSet;
    let version;
    let hasNestedSortableFix;
    // Initialize the constants that depend on ko and $
    function initializeConstants(ko, $) {
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

    let ko$3;
    let $$3;
    function initializeUtils(koInstance, jQueryInstance) {
        ko$3 = koInstance;
        $$3 = jQueryInstance;
    }
    //internal afterRender that adds meta-data to children
    const addMetaDataAfterRender = function (elements, data) {
        ko$3.utils.arrayForEach(elements, function (element) {
            if (element.nodeType === 1) {
                dataSet(element, ITEMKEY, data);
                dataSet(element, PARENTKEY, ko$3.utils.domData.get(element.parentNode, "ko_sortList"));
            }
        });
    };
    //prepare the proper options for the template binding
    const prepareTemplateOptions = function (valueAccessor, dataName) {
        const result = {};
        let options = {};
        let actualAfterRender;
        //build our options to pass to the template engine
        if (ko$3.utils.peekObservable(valueAccessor()).data) {
            options = unwrap(valueAccessor() || {});
            result[dataName] = options.data;
            if (Object.prototype.hasOwnProperty.call(options, "template")) {
                result.name = options.template;
            }
        }
        else {
            result[dataName] = valueAccessor();
        }
        ko$3.utils.arrayForEach([
            "afterAdd",
            "afterRender",
            "as",
            "beforeRemove",
            "includeDestroyed",
            "templateEngine",
            "templateOptions",
            "nodes"
        ], function (option) {
            if (Object.prototype.hasOwnProperty.call(options, option)) {
                result[option] = options[option];
            }
            else if (Object.prototype.hasOwnProperty.call(ko$3.bindingHandlers.sortable, option)) {
                result[option] = ko$3.bindingHandlers.sortable[option];
            }
        });
        //use an afterRender function to add meta-data
        if (dataName === "foreach") {
            if (result.afterRender) {
                //wrap the existing function, if it was passed
                actualAfterRender = result.afterRender;
                result.afterRender = function (element, data) {
                    addMetaDataAfterRender.call(data, element, data);
                    actualAfterRender.call(data, element, data);
                };
            }
            else {
                result.afterRender = addMetaDataAfterRender;
            }
        }
        //return options to pass to the template binding
        return result;
    };
    const updateIndexFromDestroyedItems = function (index, items) {
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
    const stripTemplateWhitespace = function (element, name) {
        let templateSource;
        let templateElement;
        //process named templates
        if (name) {
            templateElement = document.getElementById(name);
            if (templateElement) {
                templateSource = new ko$3.templateSources.domElement(templateElement);
                templateSource.text(templateSource.text().trim());
            }
        }
        else {
            //remove leading/trailing non-elements from anonymous templates
            $$3(element)
                .contents()
                .each(function () {
                if (this && this.nodeType !== 1) {
                    element.removeChild(this);
                }
            });
        }
    };

    let ko$2;
    let $$2;
    function initializeSortableBinding(koInstance, jQueryInstance) {
        ko$2 = koInstance;
        $$2 = jQueryInstance;
    }
    //connect items with observableArrays
    const sortableBinding = {
        init: function (element, valueAccessor, allBindingsAccessor, data, context) {
            const $element = $$2(element);
            const value = unwrap(valueAccessor()) || {};
            const templateOptions = prepareTemplateOptions(valueAccessor, "foreach");
            const sortable = {};
            stripTemplateWhitespace(element, templateOptions.name);
            //build a new object that has the global options with overrides from the binding
            $$2.extend(true, sortable, ko$2.bindingHandlers.sortable);
            if (value.options && sortable.options) {
                ko$2.utils.extend(sortable.options, value.options);
                delete value.options;
            }
            ko$2.utils.extend(sortable, value);
            //if allowDrop is an observable or a function, then execute it in a computed observable
            if (sortable.connectClass &&
                (ko$2.isObservable(sortable.allowDrop) || typeof sortable.allowDrop == "function")) {
                ko$2.computed({
                    read: function () {
                        const value = unwrap(sortable.allowDrop);
                        const shouldAdd = typeof value == "function"
                            ? value.call(this, templateOptions.foreach)
                            : value;
                        ko$2.utils.toggleDomNodeCssClass(element, sortable.connectClass, shouldAdd);
                    },
                    disposeWhenNodeIsRemoved: element
                }, this);
            }
            else {
                ko$2.utils.toggleDomNodeCssClass(element, sortable.connectClass, sortable.allowDrop);
            }
            //wrap the template binding
            ko$2.bindingHandlers.template.init(element, function () {
                return templateOptions;
            }, allBindingsAccessor, data, context);
            //keep a reference to start/update functions that might have been passed in
            const startActual = sortable.options.start;
            const updateActual = sortable.options.update;
            //ensure draggable table row cells maintain their width while dragging (unless a helper is provided)
            if (!sortable.options.helper) {
                sortable.options.helper = function (_e, ui) {
                    if (ui.is("tr")) {
                        ui.children().each(function () {
                            $$2(this).width($$2(this).width());
                        });
                    }
                    return ui;
                };
            }
            //initialize sortable binding after template binding has rendered in update function
            const createTimeout = setTimeout(function () {
                let dragItem;
                const originalReceive = sortable.options.receive;
                $element.sortable(ko$2.utils.extend(sortable.options, {
                    start: function (event, ui, ...args) {
                        //track original index
                        const el = ui.item[0];
                        dataSet(el, INDEXKEY, ko$2.utils.arrayIndexOf(ui.item.parent().children().get(), el));
                        //make sure that fields have a chance to update model
                        ui.item.find("input:focus").change();
                        if (startActual) {
                            startActual.call(this, event, ui, ...args);
                        }
                    },
                    receive: function (event, ui) {
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
                    update: function (event, ui) {
                        let sourceParent;
                        let targetParent;
                        let sourceIndex;
                        let targetIndex;
                        let arg;
                        const el = ui.item[0];
                        const parentEl = ui.item.parent()[0];
                        const item = dataGet(el, ITEMKEY) || dragItem;
                        if (!item) {
                            $$2(el).remove();
                        }
                        dragItem = null;
                        //make sure that moves only run once, as update fires on multiple containers
                        if ((item && this === parentEl) ||
                            (!hasNestedSortableFix && $$2.contains(this, parentEl))) {
                            //identify parents
                            sourceParent = dataGet(el, PARENTKEY);
                            sourceIndex = dataGet(el, INDEXKEY);
                            targetParent = dataGet(el.parentNode, LISTKEY);
                            targetIndex = ko$2.utils.arrayIndexOf(ui.item.parent().children().get(), el);
                            //take destroyed items into consideration
                            if (!templateOptions.includeDestroyed) {
                                sourceIndex = updateIndexFromDestroyedItems(sourceIndex, sourceParent);
                                targetIndex = updateIndexFromDestroyedItems(targetIndex, targetParent);
                            }
                            //build up args for the callbacks
                            if (sortable.beforeMove || sortable.afterMove) {
                                arg = {
                                    item: item,
                                    sourceParent: sourceParent,
                                    sourceParentNode: (sourceParent && ui.sender) || el.parentNode,
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
                                $$2(sourceParent === targetParent ? this : ui.sender || this).sortable("cancel");
                            }
                            //for a draggable item just remove the element
                            else {
                                $$2(el).remove();
                            }
                            //if beforeMove told us to cancel, then we are done
                            if (arg && arg.cancelDrop) {
                                return;
                            }
                            //if the strategy option is unset or false, employ the order strategy involving removal and insertion of items
                            if (!Object.prototype.hasOwnProperty.call(sortable, "strategyMove") ||
                                sortable.strategyMove === false) {
                                //do the actual move
                                if (targetIndex >= 0) {
                                    if (sourceParent) {
                                        sourceParent.splice(sourceIndex, 1);
                                        //if using deferred updates plugin, force updates
                                        if (ko$2.processAllDeferredBindingUpdates) {
                                            ko$2.processAllDeferredBindingUpdates();
                                        }
                                        //if using deferred updates on knockout 3.4, force updates
                                        if (ko$2.options && ko$2.options.deferUpdates) {
                                            ko$2.tasks.runEarly();
                                        }
                                    }
                                    targetParent.splice(targetIndex, 0, item);
                                }
                                //rendering is handled by manipulating the observableArray; ignore dropped element
                                dataSet(el, ITEMKEY, null);
                            }
                            else {
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
                                        }
                                        else {
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
                                    }
                                    else {
                                        // drop new element from outside
                                        targetParent.splice(targetIndex, 0, item);
                                        //rendering is handled by manipulating the observableArray; ignore dropped element
                                        dataSet(el, ITEMKEY, null);
                                        ui.item.remove();
                                    }
                                }
                            }
                            //if using deferred updates plugin, force updates
                            if (ko$2.processAllDeferredBindingUpdates) {
                                ko$2.processAllDeferredBindingUpdates();
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
                }));
                //handle enabling/disabling sorting
                if (sortable.isEnabled !== undefined) {
                    ko$2.computed({
                        read: function () {
                            $element.sortable(unwrap(sortable.isEnabled) ? "enable" : "disable");
                        },
                        disposeWhenNodeIsRemoved: element
                    });
                }
            }, 0);
            //handle disposal
            ko$2.utils.domNodeDisposal.addDisposeCallback(element, function () {
                //only call destroy if sortable has been created
                if ($element.data("ui-sortable") || $element.data("sortable")) {
                    $element.sortable("destroy");
                }
                ko$2.utils.toggleDomNodeCssClass(element, sortable.connectClass, false);
                //do not create the sortable if the element has been removed from DOM
                clearTimeout(createTimeout);
            });
            return { controlsDescendantBindings: true };
        },
        update: function (element, valueAccessor, allBindingsAccessor, data, context) {
            const templateOptions = prepareTemplateOptions(valueAccessor, "foreach");
            //attach meta-data
            dataSet(element, LISTKEY, templateOptions.foreach);
            //call template binding's update with correct options
            ko$2.bindingHandlers.template.update(element, function () {
                return templateOptions;
            }, allBindingsAccessor, data, context);
        },
        connectClass: "ko_container",
        allowDrop: true,
        afterMove: null,
        beforeMove: null,
        options: {}
    };

    let ko$1;
    let $$1;
    function initializeDraggableBinding(koInstance, jQueryInstance) {
        ko$1 = koInstance;
        $$1 = jQueryInstance;
    }
    //create a draggable that is appropriate for dropping into a sortable
    const draggableBinding = {
        init: function (element, valueAccessor, allBindingsAccessor, data, context) {
            let value = unwrap(valueAccessor()) || {};
            const options = value.options || {};
            const draggableOptions = ko$1.utils.extend({}, ko$1.bindingHandlers.draggable.options);
            const templateOptions = prepareTemplateOptions(valueAccessor, "data");
            const connectClass = value.connectClass || ko$1.bindingHandlers.draggable.connectClass;
            const isEnabled = value.isEnabled !== undefined
                ? value.isEnabled
                : ko$1.bindingHandlers.draggable.isEnabled;
            value = "data" in value ? value.data : value;
            //set meta-data
            dataSet(element, DRAGKEY, value);
            //override global options with override options passed in
            ko$1.utils.extend(draggableOptions, options);
            //setup connection to a sortable
            draggableOptions.connectToSortable = connectClass ? "." + connectClass : false;
            //initialize draggable
            $$1(element).draggable(draggableOptions);
            //handle enabling/disabling sorting
            if (isEnabled !== undefined) {
                ko$1.computed({
                    read: function () {
                        $$1(element).draggable(unwrap(isEnabled) ? "enable" : "disable");
                    },
                    disposeWhenNodeIsRemoved: element
                });
            }
            //handle disposal
            ko$1.utils.domNodeDisposal.addDisposeCallback(element, function () {
                const $element = $$1(element);
                if ($element.data("ui-draggable") || $element.data("draggable")) {
                    $element.draggable("destroy");
                }
            });
            return ko$1.bindingHandlers.template.init(element, function () {
                return templateOptions;
            }, allBindingsAccessor, data, context);
        },
        update: function (element, valueAccessor, allBindingsAccessor, data, context) {
            const templateOptions = prepareTemplateOptions(valueAccessor, "data");
            return ko$1.bindingHandlers.template.update(element, function () {
                return templateOptions;
            }, allBindingsAccessor, data, context);
        },
        connectClass: "ko_container",
        options: {
            helper: "clone"
        }
    };

    let ko;
    let $;
    function initializeDroppableBinding(koInstance, jQueryInstance) {
        ko = koInstance;
        $ = jQueryInstance;
    }
    // Simple Droppable Implementation
    // binding that updates (function or observable)
    const droppableBinding = {
        init: function (element, valueAccessor) {
            let value = unwrap(valueAccessor()) || {};
            const options = value.options || {};
            const droppableOptions = ko.utils.extend({}, ko.bindingHandlers.droppable.options);
            const isEnabled = value.isEnabled !== undefined
                ? value.isEnabled
                : ko.bindingHandlers.droppable.isEnabled;
            //override global options with override options passed in
            ko.utils.extend(droppableOptions, options);
            //get reference to drop method
            value = ("data" in value ? value.data : valueAccessor());
            //set drop method
            droppableOptions.drop = function (_event, ui) {
                const droppedItem = dataGet(ui.draggable[0], DRAGKEY) || dataGet(ui.draggable[0], ITEMKEY);
                value(droppedItem);
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

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // Initialize all modules with ko and $ instances
    initializeConstants(ko__namespace, $$4);
    initializeUtils(ko__namespace, $$4);
    initializeSortableBinding(ko__namespace, $$4);
    initializeDraggableBinding(ko__namespace, $$4);
    initializeDroppableBinding(ko__namespace, $$4);
    // Register binding handlers
    ko__namespace.bindingHandlers.sortable = sortableBinding;
    ko__namespace.bindingHandlers.draggable = draggableBinding;
    ko__namespace.bindingHandlers.droppable = droppableBinding;

}));
//# sourceMappingURL=knockout-sortable.js.map
