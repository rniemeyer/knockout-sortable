//knockout-sortable | (c) 2012 Ryan Niemeyer | http://www.opensource.org/licenses/mit-license
(function(ko, $, undefined) {
var prepareTemplateOptions = function(valueAccessor) {
    var result = {},
        options = ko.utils.unwrapObservable(valueAccessor());

    //build our options to pass to the template engine
    if (options.data) {
        result.foreach = options.data;
        result.name = options.template;
        result.afterAdd = options.afterAdd;
        result.beforeRemove = options.beforeRemove;
        result.afterRender = options.afterRender;
        result.includeDestroyed = options.includeDestroyed;
        result.templateEngine = options.templateEngine;
    } else {
        result.foreach = valueAccessor();
    }

    //use an afterRender function to add meta-data
    if (options.afterRender) {
        //wrap the existing function, if it was passed
        result.afterRender = function(element, data) {
            ko.bindingHandlers.sortable.afterRender.call(data, element, data);
            options.afterRender.call(data, element, data);
        };
    } else {
        result.afterRender = ko.bindingHandlers.sortable.afterRender;
    }

    //return options to pass to the template binding
    return result;
};

var itemKey = "ko_sortItem",
    listKey = "ko_sortList",
    parentKey = "ko_parentList";

//connect items with observableArrays
ko.bindingHandlers.sortable = {
    init: function(element, valueAccessor, allBindingsAccessor, data, context) {
        var $element = $(element),
            value = ko.utils.unwrapObservable(valueAccessor()),
            templateOptions = prepareTemplateOptions(valueAccessor),
            sortable = {};

        //build a new object that has the global options with overrides from the binding
        ko.utils.extend(sortable, ko.bindingHandlers.sortable);
        ko.utils.extend(sortable, value || {});

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

        //attach meta-data
        ko.utils.domData.set(element, listKey, templateOptions.foreach);

        //wrap the template binding
        var templateArgs = [element, function() { return templateOptions; }, allBindingsAccessor, data, context];
        ko.bindingHandlers.template.init.apply(this, templateArgs);
        ko.computed({
            read: function() {
                ko.bindingHandlers.template.update.apply(this, templateArgs);
            },
            disposeWhenNodeIsRemoved: element,
            owner: this
        });

        //initialize sortable binding
        $element.sortable(ko.utils.extend(sortable.options, {
            update: function(event, ui) {
                var sourceParent, targetParent, targetIndex, arg,
                    el = ui.item[0],
                    item = ko.utils.domData.get(el, itemKey);
                    
                //give access to parent node
                var elParentNode = el.parentNode;

                if (item) {
                    //identify parents
                    sourceParent = ko.utils.domData.get(el, parentKey);
                    targetParent = ko.utils.domData.get(el.parentNode, listKey);
                    targetIndex = ko.utils.arrayIndexOf(ui.item.parent().children(), el);

                    if (sortable.beforeMove || sortable.afterMove) {
                        arg = {
                            item: item,
                            sourceParent: sourceParent,
                            sourceParentNode: el.parentNode,
                            sourceIndex: sourceParent.indexOf(item),
                            targetParent: targetParent,
                            targetIndex: targetIndex,
                            cancelDrop: false
                        };
                    }

                    if (sortable.beforeMove) {
                        sortable.beforeMove.call(this, arg, event, ui);
                        if (arg.cancelDrop) {
                            $(ui.sender).sortable('cancel');
                            return;
                        }
                    }

                    if (targetIndex >= 0) {
                        sourceParent.remove(item);
                        targetParent.splice(targetIndex, 0, item);
                    }

                    //rendering is handled by manipulating the observableArray; ignore dropped element
                    ko.utils.domData.set(el, itemKey, null);
                    ui.item.remove();

                    //allow binding to accept a function to execute after moving the item
                    if (sortable.afterMove) {
                       sortable.afterMove.call(this, arg, event, ui, elParentNode);
                    }
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

        //handle disposal
        ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
            $element.sortable("destroy");
        });

        return { 'controlsDescendantBindings': true };
    },
    afterRender: function(elements, data) {
        ko.utils.arrayForEach(elements, function(element) {
            if (element.nodeType === 1) {
                ko.utils.domData.set(element, itemKey, data);
                ko.utils.domData.set(element, parentKey, ko.utils.domData.get(element.parentNode, listKey));
            }
        });
    },
    connectClass: 'ko_container',
    allowDrop: true,
    afterMove: null,
    beforeMove: null,
    options: {}
};
})(ko, jQuery);