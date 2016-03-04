/// <reference path="../../typings/main.d.ts" />

import assert = require("assert");
import {Obj} from "../../util/obj";

describe('util', function() {
  describe("obj", function() {
    describe('clone', function() {
      it('should clone an object', function() {

        var obj1 = { prop1: "value1" };
        var obj2 = Obj.clone(obj1);

        assert.notEqual(obj2, obj1);
        assert.equal(obj2.prop1, obj1.prop1);
      });
    });

    describe('extend', function() {

      it('should copy the properties of one object into another', function() {

        var obj1: any = { prop1: "value1" };
        var obj2 = { prop2: "value1" };
        var obj3 = Obj.extend(obj1, obj2);

        assert.equal(obj3, obj1, "the returned instance should be the same");
        assert.equal(obj1.prop1, obj1.prop1, "the first property should'nt have changed");
        assert.equal(obj1.prop2, obj2.prop2, "the first object should contain the second property");
      });

      it('should merge array properties', function() {

        var obj1 = { items: ["value1"] };
        var obj2 = { items: ["value2"] };
        var obj3 = Obj.extend(obj1, obj2);

        assert.deepEqual(obj1.items, ["value1", "value2"], "the array must contain both elements");
      });

    });
  });
});
