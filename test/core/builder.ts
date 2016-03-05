/// <reference path="../../typings/main.d.ts" />
import {Builder} from "../../core/builder"
import {TaskExecutionContext} from "../../core/tasks"
import assert = require("assert");

describe('core', function() {
  describe("builder", function() {
    it('executes a task for the root object',function(done){
      var b = new Builder(process.cwd());

      var executed = false;
      var appDef = {myobject:{myprop:"value"}}
      b.appDef = appDef;
      b.taskManager.add("myrootTask","/",x=>{executed=true});

      var context = new TaskExecutionContext();
      context.currentItemPath = "/";
      context.currentItem = appDef;
      context.appDef = appDef;
      b.buildObject(context).then(x=>{
          assert.equal(true,executed,"The task wasnt executed :(");
          done();
      });
    });

    it('executes a task for a sub object',function(done){
      var b = new Builder(process.cwd());

      var executed = true;
      var appDef = {myobject:{myprop:{anotherProp:"value"}}}
      b.appDef = appDef;
      b.taskManager.add("myTask","/myobject/myprop",x=>{executed=true});

      var context = new TaskExecutionContext();
      context.currentItemPath = "/";
      context.currentItem = appDef;
      context.appDef = appDef;
      b.buildObject(context).then(x=>{
          assert.equal(true,executed,"The task wasnt executed :(");
          done();
      });
    });

    it('executes a task for an array item',function(done){
      var b = new Builder(process.cwd());

      var executed=false;
      var appDef = {myobject:{myprop:{anotherProp:[{prop:"value1"},{prop:"value2"},{prop:"value3"}]}}}
      b.appDef = appDef;
      b.taskManager.add("myTask","myobject/myprop/anotherProp[1]",
        x=>
          executed=(x.currentItem.prop=="value2"));

      var context = new TaskExecutionContext();
      context.currentItemPath = "/";
      context.currentItem = appDef;
      context.appDef = appDef;
      b.buildObject(context).then(x=>{
          assert.equal(true,executed,"The task wasnt executed :(");
          done();
      });
    });

    it('It doesnt runs an unexpected task',function(done){
      var b = new Builder(process.cwd());

      var executed = false;
      var appDef = {myobject:{myprop:{anotherProp:"value"}}}
      b.appDef = appDef;
      b.taskManager.add("myTask","/xxxx/myprop",x=>{executed=true;});

      var context = new TaskExecutionContext();
      context.currentItemPath = "/";
      context.currentItem = appDef;
      context.appDef = appDef;

      b.buildObject(context).then(x=>{
          assert.equal(false,executed,"The task was executed :(");
          done();
      });
    });

/*
    it('runs a template',function(done){
      var b = new Builder(process.cwd());

      var appDef = {myobject:{myprop:"value"}}
      b.appDef = appDef;
      b.templateManager.add({});

      var context = new TaskExecutionContext();
      context.currentItemPath = "root";
      context.currentItem = appDef;
      b.buildObject(context);

    });*/

  });
});
