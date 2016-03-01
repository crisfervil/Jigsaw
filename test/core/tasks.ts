/// <reference path="../../typings/tsd.d.ts" />
import {task, TaskManager, TaskSet, TaskExecutionContext} from "../../core/tasks"
import assert = require("assert");


class MySetOfTasks extends TaskSet {
  @task("testSelector")
  testTask(context:TaskExecutionContext){
    //console.log("installing webapp...");
  }
}

describe('core', function() {
  describe("tasks", function() {
    describe('task manager',function(){

      it('runs by selector',function(done){
        var tm = new TaskManager();
        var task1OK=false;
        tm.add("myTask1","mySelector",x=>task1OK=true);
        tm.add("myTask2","mySelector",x=>{if(task1OK===true)done()});
        tm.runBySelector("mySelector",new TaskExecutionContext());
      });
    });
    describe('task decorator', function() {
      it('adds task metadata', function() {

        var t = new MySetOfTasks();
        assert.ok(t.$taskDefinitions);
        assert.equal(t.$taskDefinitions.length,1);
        assert.equal(t.$taskDefinitions[0].methodName,"testTask");
        assert.equal(t.$taskDefinitions[0].selector,"testSelector");
      });
    });
  });
});
