/// <reference path="../../typings/main.d.ts" />
import {JsonPath} from "../../core/jsonPath";
import assert = require("assert");

describe('core', function() {
  describe("jsonPath", function() {
    describe("areEqual", function() {
      it('compares null values',function(){
        var path1=null;
        var path2="root/path1/";
        var result = JsonPath.areEqual(path1,path2);
        assert.equal(false,result);
      });
      it('compares two paths',function(){
        var path1="/root/path1";
        var path2="root/path1/";
        var result = JsonPath.areEqual(path1,path2);
        assert.equal(true,result);
      });
    });
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
      it('query the root object',function(){

        var obj = {prop1:{prop2:{prop3:{prop4:{value:"test"}}}}};

        var query = "/";
        var found = JsonPath.find(obj,query);

        assert.deepEqual(found, obj, JSON.stringify(found));

      });
      it('simple query',function(){

        var obj = {prop1:{prop2:{prop3:{prop4:{value:"test"}}}}};

        var query = "prop1/prop2/prop3/prop4";
        var found = JsonPath.find(obj,query);

        assert.deepEqual(found, obj.prop1.prop2.prop3.prop4, JSON.stringify(found));

      });
      it('query starting and ending with slash',function(){

        var obj = {prop1:{prop2:{prop3:{prop4:{value:"test"}}}}};

        var query = "/prop1/prop2/prop3/prop4/";
        var found = JsonPath.find(obj,query);

        assert.deepEqual(found, obj.prop1.prop2.prop3.prop4, JSON.stringify(found));

      });
      it('finds an array item',function(){

        var obj = {prop1:{prop2:{prop3:["item1","item2","item3"]}}};

        var query = "prop1/prop2/prop3[1]";
        var found = JsonPath.find(obj,query);

        assert.equal(found,"item2",JSON.stringify(found));

      });
      it('finds an array item 2',function(){

        var obj = {prop1:{prop2:{prop3:["item1","item2",{prop4:{prop5:{value1:"valueX"}}}]}}};

        var query = "prop1/prop2/prop3[2]/prop4/prop5/value1";
        var found = JsonPath.find(obj,query);

        assert.equal(found,"valueX",JSON.stringify(found));

      });
    });
  });
});
