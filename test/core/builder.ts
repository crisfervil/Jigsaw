/// <reference path="../../typings/index.d.ts" />

import {Builder} from "../../core/builder"
import {TaskExecutionContext} from "../../core/tasks"
import {Template,TemplateManager,TemplateRunner} from "../../core/templates";
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


    it('runs a template',function(done){

      var executed = false;
      var tr:TemplateRunner = {runTemplate:(x,y)=>{executed=true;return Promise.resolve(null);}};
      var tm = new TemplateManager(tr);
      var b = new Builder(process.cwd(),tm);

      var t = new Template();
      t.selector = "myobject/mysecondobject";

      var appDef = {myobject:{mysecondobject:{myprop:"value"}}};
      b.appDef = appDef;
      b.templateManager.add(t);

      var context = new TaskExecutionContext();
      context.currentItemPath = "/";
      context.currentItem = appDef;
      context.appDef = appDef;
      b.buildObject(context).then(x=>{
          assert.equal(true,executed,"The template wasnt executed :(");
          done();
      });
    });

    it('runs several templates',function(done){

      var executed = {t1:false,t2:false,t3:false};
      var tr:TemplateRunner = {runTemplate:(template,context)=>{executed[template.id]=true;return Promise.resolve(null);}};
      var tm = new TemplateManager(tr);
      var b = new Builder(process.cwd(),tm);

      var t1 = new Template();
      t1.id = "t1";
      t1.selector = "myobject/mysecondobject";

      var t2 = new Template();
      t2.id = "t2";
      t2.selector = "myobject/mysecondobject";

      var t3 = new Template();
      t3.id = "t3";
      t3.selector = "/";

      var appDef = {myobject:{mysecondobject:{myprop:"value"}}};
      b.appDef = appDef;
      b.templateManager.addRange([t1,t2,t3]);

      var context = new TaskExecutionContext();
      context.currentItemPath = "/";
      context.currentItem = appDef;
      context.appDef = appDef;
      b.buildObject(context).then(x=>{
          assert.deepEqual({t1:true,t2:true,t3:true},executed,"The template wasnt executed :(");
          done();
      });
    });
  });
});
