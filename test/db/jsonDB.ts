/// <reference path="../../typings/tsd.d.ts" />

import {jsonDB} from "../../db/jsonDb";
import assert = require("assert");


describe('app', function () {
    describe("db", function () {
        describe('jsonDB', function () {
            describe('select', function () {

                it('can get a simple path', function () {

                    var initialData = {
                        obj1: {
                            obj2: {
                                property1: "myValue"
                            }
                        }
                    };

                    var db = new jsonDB(initialData);
                    var retrieved = db.select("obj1/obj2");
                    assert.equal(retrieved.property1, "myValue", "select in a 2 level path");
                    var value = db.select("obj1/obj2/property1");
                    assert.equal(value, "myValue", "select in a ");


                });

                it('returns null for an non matching path', function () {

                    var initialData = {
                        obj1: {
                            obj2: {
                                property1: "myValue"
                            }
                        }
                    };

                    var db = new jsonDB(initialData);
                    var retrieved1 = db.select("obj2");
                    assert.equal(retrieved1, null, "first level. returned value:" + retrieved1);

                    var retrieved2 = db.select("obj1/obj1");
                    assert.equal(retrieved2, null, "second level. returned value:" + retrieved2);

                    var retrieved3 = db.select("obj1/obj2/asd");
                    assert.equal(retrieved3, null, "third level. returned value:" + retrieved3);

                });


                it('can get an array item by index', function () {

                    var initialData = {
                        obj1: {
                            obj2: {
                                items: ["value1", "value2"]
                            }
                        }
                    };

                    var db = new jsonDB(initialData);
                    var retrieved1 = db.select("obj1/obj2/items/0");
                    assert.equal(retrieved1, "value1", "select first item");
                    var retrieved2 = db.select("obj1/obj2/items/1");
                    assert.equal(retrieved2, "value2", "select second item");

                });

                it('can get an array item by id', function () {

                    var initialData = {
                        obj1: {
                            obj2: {
                                items: [{id: "a", value: "value1"}, {id: "b", value: "value2"}]
                            }
                        }
                    };

                    var db = new jsonDB(initialData);
                    var retrieved1 = db.select("obj1/obj2/items/a");
                    assert.equal(retrieved1.value, "value1", "select first item");
                    var retrieved2 = db.select("obj1/obj2/items/b");
                    assert.equal(retrieved2.value, "value2", "select first item");

                });
            });

            describe('insert', function () {
                it('can insert a simple object', function () {

                    var initialData:any = {};
                    var db = new jsonDB(initialData);

                    db.insert("obj1", "test1");
                    assert.equal(initialData.obj1, "test1", "simple insert. value: " + JSON.stringify(initialData));

                    initialData = {};
                    db = new jsonDB(initialData);
                    db.insert("obj1/obj2", "test1");
                    assert.equal(initialData.obj1.obj2, "test1", "2 level insert. value: " + JSON.stringify(initialData));

                });

                it('can overwrite an existing property', function () {

                    var initialData:any = {obj1: "test"};

                    var db = new jsonDB(initialData);
                    db.insert("obj1/obj2", "test1");
                    assert.equal(initialData.obj1.obj2, "test1", "couldn not overwrite a non object value. data: " + JSON.stringify(initialData));

                    initialData = {obj1: {obj2: {}}};

                    db = new jsonDB(initialData);
                    db.insert("obj1/obj2", {property1: "test1"});
                    assert.equal(initialData.obj1.obj2.property1, "test1", "couldn not overwrite an object value. data: " + JSON.stringify(initialData));


                });

                it('can add an item to an array', function () {
                    var initialData:any = {items: []};

                    var db = new jsonDB(initialData);
                    db.insert("items/", "test1");
                    assert.equal(initialData.items[0], "test1", "data: " + JSON.stringify(initialData));

                });

                it('can add an item to an array by index', function () {
                    var initialData:any = {items: ["test1", "test2"]};

                    var db = new jsonDB(initialData);
                    db.insert("items/1", "test3");
                    assert.equal(initialData.items[1], "test3", "data: " + JSON.stringify(initialData));

                });

                it('can add an item to an array by id', function () {
                    var initialData:any = {items: [{id: "a"}, {id: "b"}]};
                    var db = new jsonDB(initialData);
                    db.insert("items/b", {id: "b", value: "test1"});
                    assert.equal(initialData.items[1].value, "test1", "data: " + JSON.stringify(initialData));

                });

                it('can add an object to an array item by id', function () {
                    var initialData:any = {items: [{id: "a"}, {id: "b"}]};
                    var db = new jsonDB(initialData);
                    db.insert("items/b/property1/property2", "test1");
                    assert.equal(initialData.items[1].property1.property2, "test1", "data: " + JSON.stringify(initialData));

                });

            });

            describe('update', function () {
                it('can perform a simple update', function () {

                    var initialData:any = {obj1: {obj2: {prop1: "value1"}, prop1: "value1"}};
                    var db = new jsonDB(initialData);
                    db.update("obj1/obj2/prop1", "test1");
                    assert.equal(initialData.obj1.obj2.prop1, "test1", "data: " + JSON.stringify(initialData));
                });

                it('updates only the object, not its descendants', function () {

                    var initialData:any = {obj1: {obj2: {prop1: "value1"}, prop1: "value1"}};
                    var db = new jsonDB(initialData);
                    db.update("obj1", {prop1: "test1"});
                    assert.equal(initialData.obj1.prop1, "test1", "The object is not being updated. data: " + JSON.stringify(initialData));
                    assert.equal(initialData.obj1.obj2.prop1, "value1", "The descendants are updated. data: " + JSON.stringify(initialData));

                });
                it('throws an exception when there is an invalid path', function () {

                    var initialData:any = {obj1: {obj2: {prop1: "value1"}, prop1: "value1"}};
                    var db = new jsonDB(initialData);
                    assert.throws(()=>db.update("obj2", ""), /Object not found/);

                });


            });

            describe('delete', function () {
                it("performs a simple delete", function () {
                    var initialData:any = {obj1: {obj2: {prop1: "value1"}, prop1: "value1"}};
                    var db = new jsonDB(initialData);
                    db.delete("obj1");
                    assert.equal(initialData.obj1, undefined, "data: " + JSON.stringify(initialData));
                });
                it("removes a sub object", function () {
                    var initialData:any = {obj1: {obj2: {prop1: "value1"}, prop1: "value1"}};
                    var db = new jsonDB(initialData);
                    db.delete("obj1/obj2");
                    assert.equal(initialData.obj2, undefined, "data: " + JSON.stringify(initialData));
                    assert.equal(initialData.obj1.prop1, "value1", "data: " + JSON.stringify(initialData));
                });
                it("removes an array item", function () {
                    var initialData:any = {obj1: {items: ["item1", "item2"]}};
                    var db = new jsonDB(initialData);
                    db.delete("obj1/items/1");
                    assert.equal(initialData.obj1.items.length, 1, "data: " + JSON.stringify(initialData));
                });
            });

        });
    });
});
