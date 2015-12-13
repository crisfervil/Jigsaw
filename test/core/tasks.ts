/// <reference path="../../typings/tsd.d.ts" />
import {task, TaskSet, TaskExecutionContext} from "../../core/tasks"
import assert = require("assert");


class MySetOfTasks extends TaskSet {
  @task("testSelector")
  testTask(context:TaskExecutionContext){
    console.log("installing webapp...");
  }
}

describe('core', function() {
  describe("tasks", function() {
    describe('task decorator', function() {
      it('add task metadata', function() {

        var t = new MySetOfTasks();
        assert.ok(t.$taskDefinitions);
        assert.equal(t.$taskDefinitions.length,1);
        assert.equal(t.$taskDefinitions[0].methodName,"testTask");
        assert.equal(t.$taskDefinitions[0].selector,"testSelector");
      });
    });
  });
});
