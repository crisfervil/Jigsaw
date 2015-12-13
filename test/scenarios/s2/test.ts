/// <reference path="../../../typings/tsd.d.ts" />
import {Builder} from "../../../core/builder"
import {TaskExecutionContext} from "../../../core/tasks";

import assert = require("assert");
import path = require("path");

describe("Integration tests",function(){
  describe("Scenario 2", function() {
    it("Loads and installs package correctly",function(done){
        var builder = new Builder(__dirname);
        builder.load()
            .then(()=>{
                        assert.ok(builder.installedModules);
                        assert.deepEqual(builder.installedModules, ["m1","m2"]);

                        //validates the results of the app def merging
                        var appDef = builder.appDef();
                        assert.ok(appDef!=null);
                        assert.ok(builder.modelDef()!=null);
                        assert.equal(appDef.property1,"value1-updated-updated");
                        assert.equal(appDef.property2,12);
                        assert.deepEqual(appDef.property3,["abc",123,"456",789,555]);
                        assert.equal(appDef.property4["property4.1"],"value4.1");
                        assert.equal(appDef.property4["property4.2"],"value4.2");
                        assert.equal(appDef.property5.length,3);
                        assert.equal(appDef.property5[2].a1,"value3");
                        //assert.notEqual(appDef.property6,undefined);

                        // validate the taks loading
                        assert.equal(builder.taskManager().tasks().length,2);
                        assert.equal(builder.taskManager().tasks()[0].id,"m1\\MyBuildTasks\\app");
                        assert.equal(builder.taskManager().tasks()[0].action(new TaskExecutionContext()),"test1");

                        assert.equal(builder.taskManager().tasks()[1].id,"m2\\MyBuildTasksInModule2\\myTask");
                        assert.equal(builder.taskManager().tasks()[1].action(new TaskExecutionContext()),"test2");

                        // validate templates
                        assert.ok(builder.templateManager().templates());
                        assert.equal(builder.templateManager().templates().length,2);
                        assert.equal(builder.templateManager().templates()[0].module,"m1");
                        assert.equal(builder.templateManager().templates()[0].id,"template1");
                        assert.equal(builder.templateManager().templates()[0].path,"templates\\template1.js");

                        assert.equal(builder.templateManager().templates()[1].module,"m2");
                        assert.equal(builder.templateManager().templates()[1].id,"template1");
                        assert.equal(builder.templateManager().templates()[1].path,"templates\\template1.js");


                        done(); })
            .catch(error=>{done(error);});
    });
  });
});
