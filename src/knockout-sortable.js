(function(ko, $, undefined) {
    var ITEMKEY = "ko_sortItem",
        LISTKEY = "ko_sortList",
        PARENTKEY = "ko_parentList",
        DRAGKEY = "ko_dragItem",
        PARENTVMKEY = 'ko_parentvm';

    //internal afterRender that adds meta-data to children
    var addMetaDataAfterRender = function(elements, data) {
        ko.utils.arrayForEach(elements, function(element) {
            if (element.nodeType === 1) {
                ko.utils.domData.set(element, ITEMKEY, data);
                ko.utils.domData.set(element, PARENTKEY, ko.utils.domData.get(element.parentNode, LISTKEY));
            }
        });
    };

    //prepare the proper options for the template binding
    var prepareTemplateOptions = function(valueAccessor, dataName) {
        var result = {},
            options = ko.utils.unwrapObservable(valueAccessor()),
            actualAfterRender;

        //build our options to pass to the template engine
        if (options.data) {
            result[dataName] = options.data;
            result.name = options.template;
        } else {
            result[dataName] = valueAccessor();
        }

        ko.utils.arrayForEach(["afterAdd", "afterRender", "beforeRemove", "includeDestroyed", "templateEngine", "templateOptions"], function (option) {
            result[option] = options[option] || ko.bindingHandlers.sortable[option];
        });

        //use an afterRender function to add meta-data
        if (dataName === "foreach") {
            if (result.afterRender) {
                //wrap the existing function, if it was passed
                actualAfterRender = result.afterRender;
                result.afterRender = function(element, data) {
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

    //connect items with observableArrays
    ko.bindingHandlers.sortable = {
        init: function(element, valueAccessor, allBindingsAccessor, data, context) {
            var $element = $(element),
                value = ko.utils.unwrapObservable(valueAccessor()) || {},
                templateOptions = prepareTemplateOptions(valueAccessor, "foreach"),
                sortable = {},
                startActual, updateActual;

            //remove leading/trailing text nodes from anonymous templates
            ko.utils.arrayForEach(element.childNodes, function(node) {
                if (node && node.nodeType === 3) {
                    node.parentNode.removeChild(node);
                }
            });

            //build a new object that has the global options with overrides from the binding
            $.extend(true, sortable, ko.bindingHandlers.sortable);
            if (value.options && sortable.options) {
                ko.utils.extend(sortable.options, value.options);
                delete value.options;
            }
            ko.utils.extend(sortable, value);

            //if allowDrop is an observable or a function, then execute it in a computed observable
            if (sortable.connectClass && (ko.isObservable(sortable.allowDrop) || typeof sortable.allowDrop == "function")) {
                ko.computed({
                    read: function() {
                        var value = ko.utils.unwrapObservable(sortable.allowDrop),
                            shouldAdd = typeof value == "function" ? value.call(this, templateOptions.foreach) : value;
                        ko.utils.toggleDomNodeCssClass(element, sortable.connectClass, shouldAdd);
                    },
                    disposeWhenNodeIsRemoved: element
                }, this);
            } else {
                ko.utils.toggleDomNodeCssClass(element, sortable.connectClass, sortable.allowDrop);
            }

            //wrap the template binding
            ko.bindingHandlers.template.init(element, function() { return templateOptions; }, allBindingsAccessor, data, context);

            //keep a reference to start/update functions that might have been passed in
            startActual = sortable.options.start;
            updateActual = sortable.options.update;

            //initialize sortable binding after template binding has rendered in update function
            setTimeout(function() {
                var dragItem, currentParentViewModel;
                $element.sortable(ko.utils.extend(sortable.options, {
                    start: function(event, ui) {
                        //make sure that fields have a chance to update model
                        ui.item.find("input:focus").change();
                        if (startActual) {
                            startActual.apply(this, arguments);
                        }
                    },
                    receive: function(event, ui) {
                        dragItem = ko.utils.domData.get(ui.item[0], DRAGKEY);
                    },
                    sort: function (event, ui) {
                        // If no isAccepted callback, return
                        if (!sortable.isAccepted) return;
                        // Get placeholder and parent DOM elements and make sure they're set
                        var helper = ui.helper,
                            placeholderParent = ui.placeholder && ui.placeholder.size() ? ui.placeholder.parent() : null;
                        if (!placeholderParent.size() || !helper.size()) return;
                        // Get parent viewmodel and item viewmodel attached and make sure they're set
                        var parentViewModel = ko.utils.domData.get(placeholderParent[0], PARENTVMKEY),
                            itemViewModel = ko.utils.domData.get(helper[0], ITEMKEY) || ko.utils.domData.get(helper[0], DRAGKEY);
                        if (!parentViewModel || !itemViewModel) return;
                        // If changing the parent that we're dragging over, call isValid to see if it's a valid target
                        if (!currentParentViewModel || currentParentViewModel !== parentViewModel) {
                            // Set current parent so we only call isValid once per parent change
                            currentParentViewModel = parentViewModel;
                            var isValid = sortable.isAccepted.call(currentParentViewModel, currentParentViewModel, itemViewModel);
                            // Set placeholder valid/invalid state
                            var body = $('body');
                            if (!isValid) {
                                ui.placeholder.addClass(sortable.invalidDropClass);
                                body.css('cursor', sortable.invalidDropCursor);
                            }
                            else {
                                ui.placeholder.removeClass(sortable.invalidDropClass);
                                body.css('cursor', sortable.options.cursor || 'auto');
                            }
                        }
                    },
                    update: function(event, ui) {
                        var sourceParent, targetParent, targetParentVm, targetIndex, i, targetUnwrapped, arg,
                            el = ui.item[0],
                            isDrag = !!dragItem,
                            item = ko.utils.domData.get(el, ITEMKEY) || dragItem;

                        dragItem = null;
                        currentParentViewModel = null;

                        if (item) {
                            //identify parents
                            sourceParent = ko.utils.domData.get(el, PARENTKEY);
                            targetParent = ko.utils.domData.get(el.parentNode, LISTKEY);
                            targetParentVm = ko.utils.domData.get(el.parentNode, PARENTVMKEY);
                            targetIndex = ko.utils.arrayIndexOf(ui.item.parent().children(), el);
                            if (isDrag && item.clone) {
                                item = item.clone.call(item, targetParentVm);
                            }

                            //take destroyed items into consideration
                            if (!templateOptions.includeDestroyed) {
                                targetUnwrapped = targetParent();
                                for (i = 0; i < targetIndex; i++) {
                                    //add one for every destroyed item we find before the targetIndex in the target array
                                    if (targetUnwrapped[i] && targetUnwrapped[i]._destroy) {
                                        targetIndex++;
                                    }
                                }
                            }

                            if (sortable.beforeMove || sortable.afterMove || sortable.isAccepted) {
                                arg = {
                                    item: item,
                                    sourceParent: sourceParent,
                                    sourceParentNode: sourceParent && el.parentNode,
                                    sourceIndex: sourceParent && sourceParent.indexOf(item),
                                    targetParent: targetParent,
                                    targetIndex: targetIndex,
                                    cancelDrop: false
                                };
                            }

                            if (sortable.beforeMove) {
                                sortable.beforeMove.call(this, arg, event, ui);
                                if (arg.cancelDrop) {
                                    //call cancel on the correct list
                                    if (arg.sourceParent) {
                                        $(arg.sourceParent === arg.targetParent ? this : ui.sender).sortable('cancel');
                                    }
                                    //for a draggable item just remove the element
                                    else {
                                        $(el).remove();
                                    }
                                    return;
                                }
                            }
                            if (sortable.isAccepted) {
                                var isValid = sortable.isAccepted.call(targetParentVm, targetParentVm, item);
                                if (isValid === false) {
                                    //call cancel on the correct list
                                    if (arg.sourceParent) {
                                        $(arg.sourceParent === arg.targetParent ? this : ui.sender).sortable('cancel');
                                    }
                                    //for a draggable item just remove the element
                                    else {
                                        $(el).remove();
                                    }

                                    return;
                                }
                            }

                            if (targetIndex >= 0) {
                                if (sourceParent) {
                                    sourceParent.remove(item);
                                }

                                targetParent.splice(targetIndex, 0, item);
                            }

                            //rendering is handled by manipulating the observableArray; ignore dropped element
                            ko.utils.domData.set(el, ITEMKEY, null);
                            ui.item.remove();

                            //allow binding to accept a function to execute after moving the item
                            if (sortable.afterMove) {
                                sortable.afterMove.call(this, arg, event, ui);
                            }
                        }

                        if (updateActual) {
                            updateActual.apply(this, arguments);
                        }
                        // Clear DOM data on helper
                        if (ui.helper && ui.helper.size()) {
                            ko.utils.domData.clear(ui.helper[0]);
                        }
                    },
                    connectWith: sortable.connectClass ? "." + sortable.connectClass : false
                }));

                //handle enabling/disabling sorting
                if (sortable.isEnabled !== undefined) {
                    ko.computed({
                        read: function() {
                            $element.sortable(ko.utils.unwrapObservable(sortable.isEnabled) ? "enable" : "disable");
                        },
                        disposeWhenNodeIsRemoved: element
                    });
                }
            }, 0);

            //handle disposal
            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $element.sortable("destroy");
            });

            return { 'controlsDescendantBindings': true };
        },
        update: function(element, valueAccessor, allBindingsAccessor, data, context) {
            var templateOptions = prepareTemplateOptions(valueAccessor, "foreach");

            //attach meta-data
            ko.utils.domData.set(element, LISTKEY, templateOptions.foreach);
            ko.utils.domData.set(element, PARENTVMKEY, data);

            //call template binding's update with correct options
            ko.bindingHandlers.template.update(element, function() { return templateOptions; }, allBindingsAccessor, data, context);
        },
        connectClass: 'ko_container',
        allowDrop: true,
        afterMove: null,
        beforeMove: null,
        invalidDropClass: 'invalid-drop',
        invalidDropCursor: 'not-allowed',
        options: {}
    };

    //create a draggable that is appropriate for dropping into a sortable
    ko.bindingHandlers.draggable = {
        init: function(element, valueAccessor, allBindingsAccessor, data, context) {
            var value = ko.utils.unwrapObservable(valueAccessor()) || {},
                options = value.options || {},
                draggableOptions = ko.utils.extend({}, ko.bindingHandlers.draggable.options),
                templateOptions = prepareTemplateOptions(valueAccessor, "data"),
                connectClass = value.connectClass || ko.bindingHandlers.draggable.connectClass,
                isEnabled = value.isEnabled !== undefined ? value.isEnabled : ko.bindingHandlers.draggable.isEnabled,
                startActual = draggableOptions.start;

            value = value.data || value;

            //set meta-data
            ko.utils.domData.set(element, DRAGKEY, value);

            //override global options with override options passed in
            ko.utils.extend(draggableOptions, options);

            //setup connection to a sortable

            draggableOptions.connectToSortable = connectClass ? "." + connectClass : false;
            draggableOptions.start = function (event, ui) {
                var helper = ui.helper;
                if (!helper || !helper.size()) return;
                ko.utils.domData.set(helper[0], DRAGKEY, value);
                if (startActual) {
                    startActual.apply(this, arguments);
                }
            };

            //initialize draggable
            $(element).draggable(draggableOptions);

            //handle enabling/disabling sorting
            if (isEnabled !== undefined) {
                ko.computed({
                    read: function() {
                        $(element).draggable(ko.utils.unwrapObservable(isEnabled) ? "enable" : "disable");
                    },
                    disposeWhenNodeIsRemoved: element
                });
            }

            return ko.bindingHandlers.template.init(element, function() { return templateOptions; }, allBindingsAccessor, data, context);
        },
        update: function(element, valueAccessor, allBindingsAccessor, data, context) {
            var templateOptions = prepareTemplateOptions(valueAccessor, "data");

            return ko.bindingHandlers.template.update(element, function() { return templateOptions; }, allBindingsAccessor, data, context);
        },
        connectClass: ko.bindingHandlers.sortable.connectClass,
        options: {
            helper: "clone"
        }
    };

})(ko, jQuery);