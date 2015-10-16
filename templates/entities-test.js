// item: app/entities/item
// output: test/<%=currentItem.id%>.js
/** tests for the entity <%= currentItem.name %>, application <%= appDef.name %> */

var entityManager=require("../app/entities/<%= currentItem.id %>");
var assert = require("assert");


describe('entities', function () {
    describe("<%= currentItem.id %>", function () {
        describe('select', function () {
            it('should returns all the items without any criteria', function () {
                var criteria = {};
                var result = entityManager.select(criteria);
                assert.notEqual(result,null,"result: " + JSON.stringify(result));
            });
          });
        });
      });
