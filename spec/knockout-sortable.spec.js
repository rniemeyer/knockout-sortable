describe("knockout-sortable", function(){
    //helper engine that can use a template from a string
    ko.stringTemplateEngine = function() {
        var templates = { data: {} };

        var stringTemplateSource = function(template) {
            this.text = function(value) {
                if (arguments.length === 0) {
                    return templates[template];
                }
                templates[template] = value;
            };
        };

        var templateEngine = new ko.nativeTemplateEngine();
        templateEngine.makeTemplateSource = function(template) {
            return new stringTemplateSource(template);
        };

        templateEngine.addTemplate = function(key, value) {
            templates[key] = value;
        };

        return templateEngine;
    };

    var defaults = {
        connectClass: ko.bindingHandlers.sortable.connectClass,
        allowDrop: ko.bindingHandlers.sortable.allowDrop,
        beforeMove: ko.bindingHandlers.sortable.beforeMove,
        afterMove: ko.bindingHandlers.sortable.afterMove
    };

    var setup = function(options) {
        ko.setTemplateEngine(options.engine || new ko.nativeTemplateEngine());
        options.root = options.elems.first();
        $("body").append(options.root);
        options.root.hide();
        ko.applyBindings(options.vm, options.root[0]);
    };

    describe("sortable binding", function() {
        beforeEach(function() {
            //restore defaults
            ko.utils.extend(ko.bindingHandlers.sortable, defaults);
        });

        describe("when using an anonymous template", function(){
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: items'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]) }
                };

                setup(options);
            });

            it("should render all items", function(){
                expect(options.root.children().length).toEqual(3);
            });
        });

        describe("when using a named template", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: { template: \"itemTmpl\", data: items }'></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]) },
                    engine: ko.stringTemplateEngine()
                };

                options.engine.addTemplate("itemTmpl", "<li></li>");
                setup(options);
            });

            it("should render all items", function(){
                expect(options.root.children().length).toEqual(3);
            });
        });

        describe("when using the default options", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: items'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]) }
                };

                setup(options);
            });

            it("should add the default connectWith class 'ko_container' to the root element", function(){
                expect(options.root.hasClass(defaults.connectClass)).toBeTruthy();
            });

            it("should call .sortable on the root element", function() {
                waits(0);
                runs(function() {
                    expect(options.root.data("sortable")).toBeDefined();
                });
                
            });

            it("should attach meta-data to the root element indicating the parent observableArray", function() {
                expect(ko.utils.domData.get(options.root[0], "ko_sortList")).toEqual(options.vm.items);
            });

            it("should attach meta-data to child elements indicating their item", function() {
                expect(ko.utils.domData.get(options.root.children()[0], "ko_sortItem")).toEqual(options.vm.items()[0]);
            });

            it("should attach meta-data to child elements indicating their parent observableArray", function() {
                expect(ko.utils.domData.get(options.root.children()[0], "ko_parentList")).toEqual(options.vm.items);
            });
        });

        describe("when setting allowDrop globally to false", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: items'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]) }
                };

                ko.bindingHandlers.sortable.allowDrop = false;
                setup(options);
            });

            it("should not add the default connectWith class 'ko_container' to the root element", function(){
                expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
            });
        });

        describe("when setting allowDrop globally to an observable that is false", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: items'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]) }
                };

                ko.bindingHandlers.sortable.allowDrop = ko.observable(false);
                setup(options);
            });

            it("should not add the default connectWith class 'ko_container' to the root element", function(){
                expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
            });

            it("should add the default connectWith class after setting the observable to true", function() {
                ko.bindingHandlers.sortable.allowDrop(true);
                expect(options.root.hasClass(defaults.connectClass)).toBeTruthy();
            });
        });

        describe("when setting allowDrop globally to a function", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: items'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]), disabled: function(list) { return list().length > 3; } }
                };

                ko.bindingHandlers.sortable.allowDrop = options.vm.disabled;
                setup(options);
            });

            it("should not add the default connectWith class 'ko_container' to the root element", function(){
                expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
            });

            it("should add the default connectWith class after setting the observable to true", function() {
                options.vm.items.push(4);
                expect(options.root.hasClass(defaults.connectClass)).toBeTruthy();
            });
        });

        describe("when passing false for allowDrop in the binding options", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: { data: items, allowDrop: false }'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]) }
                };

                setup(options);
            });

            it("should not add the default connectWith class 'ko_container' to the root element", function(){
                expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
            });
        });

        describe("when passing an observable that is false for allowDrop in the binding options", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: { data: items, allowDrop: enabled }'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]), enabled: ko.observable(false) }
                };

                setup(options);
            });

            it("should not add the default connectWith class 'ko_container' to the root element", function(){
                expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
            });

            it("should add the default connectWith class after setting the observable to true", function() {
                options.vm.enabled(true);
                expect(options.root.hasClass(defaults.connectClass)).toBeTruthy();
            });
        });

        describe("when passing a function for allowDrop in the binding options", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: { data: items, allowDrop: disabled }'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]), disabled: function(list) { return list().length > 3; } }
                };

                setup(options);
            });

            it("should not add the default connectWith class 'ko_container' to the root element", function(){
                expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
            });

            it("should re-evaluate the allowDrop function when any observables change and add the connectWith class, if appropriate", function() {
                options.vm.items.push(4);
                expect(options.root.hasClass(defaults.connectClass)).toBeTruthy();
            });
        });

        describe("when overriding the connectWith class globally", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: items'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]) }
                };
            });
            
            describe("when using an override class", function() {
                beforeEach(function() {
                    ko.bindingHandlers.sortable.connectClass = "mycontainer";
                    setup(options);
                });

                it("should not add the default connectWith class 'ko_container' to the root element", function(){
                    expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
                });

                it("should add the overriden connectWith class 'mycontainer' to the root element", function(){
                    expect(options.root.hasClass('mycontainer')).toBeTruthy();
                });
            });
            
            describe("when setting the connectWith class to null", function() {
                beforeEach(function() {
                    ko.bindingHandlers.sortable.connectClass = null;
                    setup(options);
                });
                
                it("should not add a connectWith class to the root element", function() {
                    expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
                });
                
                it("should set this element's sortable connectWith option to false", function() {
                    waits(0);
                    runs(function() {
                        expect(options.root.sortable("option", "connectWith")).toEqual(false);
                    }); 
                });
            });
            
            describe("when setting the connectWith class to false", function() {
                beforeEach(function() {
                    ko.bindingHandlers.sortable.connectClass = false;
                    setup(options);
                });
                
                it("should not add a connectWith class to the root element", function() {
                    expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
                });
                
                it("should set this element's sortable connectWith option to false", function() {
                    waits(0);
                    runs(function() {
                        expect(options.root.sortable("option", "connectWith")).toEqual(false);
                    });
                });
            });
        });

        describe("when overriding connectClass in the binding options", function() {
            var options;
            
            describe("when using an override class", function() {
                beforeEach(function() {
                    options = {
                        elems: $("<ul data-bind='sortable: { data: items, connectClass: \"mycontainer\" }'><li data-bind='text: $data'></li></ul>"),
                        vm: { items: ko.observableArray([1, 2, 3]) }
                    };

                    setup(options);
                });
                
                it("should not add the default connectWith class 'ko_container' to the root element", function(){
                    expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
                });

                it("should add the overriden connectWith class 'mycontainer' to the root element", function(){
                    expect(options.root.hasClass('mycontainer')).toBeTruthy();
                });
            });
            
            describe("when setting the connectWith class to null", function() {
                beforeEach(function() {
                    options = {
                        elems: $("<ul data-bind='sortable: { data: items, connectClass: null }'><li data-bind='text: $data'></li></ul>"),
                        vm: { items: ko.observableArray([1, 2, 3]) }
                    };

                    setup(options);
                });
                
                it("should not add a connectWith class to the root element", function() {
                    expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
                });
                
                it("should set this element's sortable connectWith option to false", function() {
                    waits(0);
                    runs(function() {
                        expect(options.root.sortable("option", "connectWith")).toEqual(false);
                    });
                });
            });
            
            describe("when setting the connectWith class to false", function() {
                beforeEach(function() {
                    options = {
                        elems: $("<ul data-bind='sortable: { data: items, connectClass: false }'><li data-bind='text: $data'></li></ul>"),
                        vm: { items: ko.observableArray([1, 2, 3]) }
                    };

                    setup(options);
                });
                
                it("should not add a connectWith class to the root element", function() {
                    expect(options.root.hasClass(defaults.connectClass)).toBeFalsy();
                });
                
                it("should set this element's sortable connectWith option to false", function() {
                    waits(0);
                    runs(function() {
                        expect(options.root.sortable("option", "connectWith")).toEqual(false);
                    });
                });
            });
        });

        describe("when setting isEnabled globally", function() {
            var options;
            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: items'><li data-bind='text: $data'></li></ul>"),
                    vm: {
                        items: ko.observableArray([1, 2, 3]),
                        isEnabled: ko.observable(false)
                    }
                };
            });

            describe("when isEnabled is an observable", function() {
                beforeEach(function() {
                    ko.bindingHandlers.sortable.isEnabled = options.vm.isEnabled;
                    setup(options);
                });

                it("should be initially disabled", function() {
                    waits(0);
                    runs(function() {
                        expect(options.root.sortable("option", "disabled")).toBeTruthy();
                    });
                });

                it("should become enabled when observable is changed to true", function() {
                    waits(0);
                    runs(function() {
                        options.vm.isEnabled(true);
                        expect(options.root.sortable("option", "disabled")).toBeFalsy();
                    });
                })
            });

            describe("when isEnabled is a non-observable", function() {
                beforeEach(function() {
                    ko.bindingHandlers.sortable.isEnabled = false;
                    setup(options);
                });

                it("should be initially disabled", function() {
                    waits(0);
                    runs(function() {
                        expect(options.root.sortable("option", "disabled")).toBeTruthy();
                    });
                });
            });
        });

        describe("when setting isEnabled in the binding", function() {
            var options;
            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: { data: items, isEnabled: isEnabled }'><li data-bind='text: $data'></li></ul>"),
                    vm: {
                        items: ko.observableArray([1, 2, 3]),
                        isEnabled: ko.observable(false)
                    }
                };
            });

            describe("when isEnabled is an observable", function() {
                beforeEach(function() {
                    setup(options);
                });

                it("should be initially disabled", function() {
                    waits(0);
                    runs(function() {
                        expect(options.root.sortable("option", "disabled")).toBeTruthy();
                    });
                });

                it("should become enabled when observable is changed to true", function() {
                    waits(0);
                    runs(function() {
                        options.vm.isEnabled(true);
                        expect(options.root.sortable("option", "disabled")).toBeFalsy();                    
                    });
                })
            });

            describe("when isEnabled is a non-observable", function() {
                beforeEach(function() {
                    options.vm.isEnabled = false;
                    setup(options);
                });

                it("should be initially disabled", function() {
                    waits(0);
                    runs(function() {
                        expect(options.root.sortable("option", "disabled")).toBeTruthy();
                    });
                });
            });
        });

        describe("when passing extra options for .sortable in the binding", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: { data: items, options: { axis: \"x\" } }'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]) }
                };

                setup(options);
            });

            it("should pass the option on to .sortable properly", function() {
                waits(0);
                runs(function() {
                    expect(options.root.sortable("option", "axis")).toEqual('x');
                });
            });
        });

        describe("when setting extra options for .sortable globally", function() {
            var options;

            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: items'><li data-bind='text: $data'></li></ul>"),
                    vm: { items: ko.observableArray([1, 2, 3]) }
                };

                ko.bindingHandlers.sortable.options = { axis: 'x' };

                setup(options);
            });

            it("should pass the option on to .sortable properly", function() {
                waits(0);
                runs(function() {
                    expect(options.root.sortable("option", "axis")).toEqual('x');
                });
            });
        });
        
        describe("when using a computed observable to return an observableArray", function() {
            var options;
            
            beforeEach(function() {
                options = {
                    elems: $("<ul data-bind='sortable: activeList()'><li data-bind='text: $data'></li></ul>"),
                    vm: { 
                        itemsOne: ko.observableArray([1, 2, 3]),
                        itemsTwo: ko.observableArray(["a", "b", "c"]),
                        useTwo: ko.observable(false)
                    }
                };
                
                options.vm.activeList = ko.computed(function() {
                    return this.useTwo() ? this.itemsTwo : this.itemsOne;
                }, options.vm);

                setup(options);
            });
            
            it("should render the initial list", function() {
                expect(options.root.children().first().text()).toEqual("1");
                expect(options.root.children(":nth-child(2)").text()).toEqual("2");
                expect(options.root.children(":nth-child(3)").text()).toEqual("3");
            });
            
            describe("when updating the list that is returned by the computed observable", function() {
                it("should render the new list", function() {
                    options.vm.useTwo(true);
                    expect(options.root.children().first().text()).toEqual("a");
                    expect(options.root.children(":nth-child(2)").text()).toEqual("b");
                    expect(options.root.children(":nth-child(3)").text()).toEqual("c");
                });
            });
        });
    }); 
});