/// <reference path="../../typings/tsd.d.ts" />
import {JsonPath} from "../../core/jsonPath";
import assert = require("assert");

describe('core', function() {
  describe("jsonPath", function() {
    describe("find", function() {
      it('null object',function(){

        var obj = null;

        var query = "prop1/prop2/prop3/prop4";
        var found = JsonPath.find(obj,query);

        assert.deepEqual(found, null, JSON.stringify(found));

      });
      it('null query',function(){

        var obj = {prop1:{prop2:{prop3:{prop4:{value:"test"}}}}};

        var query = null;
        var found = JsonPath.find(obj,query);

        assert.deepEqual(found, null, JSON.stringify(found));
      });
      it('invalid query 1',function(){

        var obj = {prop1:{prop2:{prop3:{prop4:{value:"test"}}}}};

        var query = " ";
        var found = JsonPath.find(obj,query);

        assert.deepEqual(found, null, JSON.stringify(found));
      });
      it('invalid query 2',function(){

        var obj = {prop1:{prop2:{prop3:{prop4:{value:"test"}}}}};

        var query = " \\";
        var found = JsonPath.find(obj,query);

        assert.deepEqual(found, null, JSON.stringify(found));
      });
      it('simple query',function(){

        var obj = {prop1:{prop2:{prop3:{prop4:{value:"test"}}}}};

        var query = "prop1/prop2/prop3/prop4";
        var found = JsonPath.find(obj,query);

        assert.deepEqual(found, obj.prop1.prop2.prop3.prop4, JSON.stringify(found));

      });
      it('query ending in slash',function(){

        var obj = {prop1:{prop2:{prop3:{prop4:{value:"test"}}}}};

        var query = "prop1/prop2/prop3/prop4/";
        var found = JsonPath.find(obj,query);

        assert.deepEqual(found, obj.prop1.prop2.prop3.prop4, JSON.stringify(found));

      });
      it('finds an array item',function(){

        var obj = {prop1:{prop2:{prop3:["item1","item2","item3"]}}};

        var query = "prop1/prop2/prop3[1]";
        var found = JsonPath.find(obj,query);

        assert.equal(found,"item2",JSON.stringify(found));

      });
    });
  });
});
