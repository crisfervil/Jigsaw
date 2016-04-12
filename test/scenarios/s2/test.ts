/// <reference path="../../../typings/main.d.ts" />
import {Builder} from "../../../core/builder"
import {TaskExecutionContext} from "../../../core/tasks";

import assert = require("assert");
import path = require("path");
import os = require("os");

describe("Integration tests",function(){
  describe("Scenario 2", function() {

    it("Loads package correctly",function(done){
        var builder = new Builder(__dirname);
        builder.load()
            .then(()=>{
                        assert.deepEqual(builder.installedModules, ["m1","m2"]);

                        //validates the results of the app def merging
                        var appDef = builder.appDef;
                        var expectedAppDef = {
                          "property1":"value1-updated-updated",
                          "property2":12,
                          "property3":["abc",123,"456",789,555],
                          "property4":{
                            "property4.1":"value4.1",
                            "property4.2":"value4.2"
                          },
                          "property5":[{"a1":"value1"},{"a1":"value2"},{"a1":"value3"}],
                          //"property6":null
                        };

                        assert.deepEqual(expectedAppDef,appDef);


                        // validate the tasks
                        assert.equal(builder.taskManager.tasks().length,2);
                        assert.equal(builder.taskManager.tasks()[0].id,"m1/MyBuildTasks/MyAppTask");
                        assert.equal(builder.taskManager.tasks()[0].selector,"app");
                        assert.equal(builder.taskManager.tasks()[0].action(new TaskExecutionContext()),"test1");

                        assert.equal(builder.taskManager.tasks()[1].id,"m2/MyBuildTasksInModule2/myTask");
                        assert.equal(builder.taskManager.tasks()[1].selector,"mySelector");
                        assert.equal(builder.taskManager.tasks()[1].action(new TaskExecutionContext()),"test2");

                        // validate templates
                        assert.ok(builder.templateManager.templates());
                        assert.equal(builder.templateManager.templates().length,4);

                        var expectedT1 = {module:"m1",
                        id:"template1",
                        path:path.join("templates","template1.htm"),
                        selector:"/test/test2[0]/test",
                        outputPath:"templateOutput/<%=currentItem.id%>.htm",
                        content:"This is a Test"+os.EOL};
                        var t1 = builder.templateManager.templates()[0];
                        assert.deepEqual(t1,expectedT1,JSON.stringify(t1));

                        var expectedT2 = {module:"m1",
                        id:"template1",
                        path:path.join("templates","template1.js"),
                        selector:"/test/test2[0]/test",
                        outputPath:"templateOutput/<%=currentItem.id%>.js",
                        content:"// This is a Test"+os.EOL};
                        var t2 = builder.templateManager.templates()[1];
                        assert.deepEqual(t2,expectedT2,JSON.stringify(t2));

                        var expectedT3 = {module:"m2",
                                          id:"template1",
                                          path:path.join("templates","template1.htm"),
                                          selector:"/test/test2[0]/test",
                                          outputPath:"templateOutput/<%=currentItem.id%>.htm",
                                          content:"This is a Test"+os.EOL};
                        var t3 = builder.templateManager.templates()[2];
                        assert.deepEqual(t3,expectedT3,JSON.stringify(t3));

                        var expectedT4 = {module:"m2",
                                          id:"template1",
                                          path:path.join("templates","template1.js"),
                                          selector:"/test/test2[0]/test",
                                          outputPath:"templateOutput/<%=currentItem.id%>.js",
                                          content:"// This is a Test"+os.EOL};
                        var t4 = builder.templateManager.templates()[3];
                        assert.deepEqual(t4,expectedT4,JSON.stringify(t4));


                        done(); })
            .catch(done);
    });

    it("Installs package correctly",function(done){
        var builder = new Builder(__dirname);
        builder.load()
            .then(()=>{
                        builder.build()
                        .then(()=>{

                          // perform asserts
                          
                          // TODO: Check if the template files were rendered

                          done();

                        })
                       })
            .catch(done);
    });

  });
});
