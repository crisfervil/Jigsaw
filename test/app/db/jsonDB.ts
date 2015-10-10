/// <reference path="../../../typings/tsd.d.ts" />

import {jsonDB} from "../../../app/db/jsonDb";
import assert = require("assert");


describe('app', function() {
  describe("db", function() {
    describe('jsonDB', function() {
      describe('select', function() {

        it('can get a simple path', function() {

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

        it('returns null for an non matching path', function() {

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


        it('can get an array item by index', function() {

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

        it('can get an array item by id', function() {

          var initialData = {
            obj1: {
              obj2: {
                items: [{ id: "a", value: "value1" }, { id: "b", value: "value2" }]
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

      describe('insert', function() {
        it('can insert a simple object', function() {

          var initialData:any = {};
          var db = new jsonDB(initialData);
          
          db.insert("obj1","test1");
          assert.equal(initialData.obj1, "test1", "simple insert. value: " + JSON.stringify(initialData));

          initialData={};
          db = new jsonDB(initialData);
          db.insert("obj1/obj2","test1");          
          assert.equal(initialData.obj1.obj2, "test1", "2 level insert. value: " + JSON.stringify(initialData));

        });

        it('can overwrite an existing property', function() {

          var initialData:any = {obj1:"test"};

          var db = new jsonDB(initialData);
          db.insert("obj1/obj2","test1");
          assert.equal(initialData.obj1.obj2, "test1", "couldn not overwrite a non object value. data: " + JSON.stringify(initialData));

          initialData = {obj1:{obj2:{}}};

          db = new jsonDB(initialData);
          db.insert("obj1/obj2",{property1:"test1"});
          assert.equal(initialData.obj1.obj2.property1, "test1", "couldn not overwrite an object value. data: " + JSON.stringify(initialData));


        });
        
        it('can add an item to an array', function() {
          var initialData:any = {items:[]};

          var db = new jsonDB(initialData);
          db.insert("items/","test1");
          assert.equal(initialData.items[0], "test1", "data: " + JSON.stringify(initialData));

        });

        it('can add an item to an array by index', function() {
          var initialData:any = {items:["test1","test2"]};

          var db = new jsonDB(initialData);
          db.insert("items/1","test3");
          assert.equal(initialData.items[1], "test3", "data: " + JSON.stringify(initialData));

        });

        it('can add an item to an array by id', function() {
          var initialData:any = {items:[{id:"a"},{id:"b"}]};
          var db = new jsonDB(initialData);
          db.insert("items/b",{id:"b",value:"test1"});
          assert.equal(initialData.items[1].value, "test1", "data: " + JSON.stringify(initialData));

        });

        it('can add an object to an array item by id', function() {
          var initialData:any = {items:[{id:"a"},{id:"b"}]};
          var db = new jsonDB(initialData);
          db.insert("items/b/property1/property2","test1");
          assert.equal(initialData.items[1].property1.property2, "test1", "data: " + JSON.stringify(initialData));

        });
        
      });

    });
  });
});
