/// <reference path="../../typings/tsd.d.ts" />
import {Builder} from "../../core/builder"
import {TaskExecutionContext} from "../../core/tasks"
import assert = require("assert");

describe('core', function() {
  describe("builder", function() {
    it('builds an object',function(done){
      var b = new Builder(process.cwd());

      var appDef = {myobject:{myprop:"value"}}
      b.appDef = appDef;
      b.taskManager.add("myrootTask","root",x=>{console.log(x);done()});

      var context = new TaskExecutionContext();
      context.currentItemPath = "root";
      context.currentItem = appDef;
      b.buildObject(context);

    });
  });
});
