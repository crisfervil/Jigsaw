/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import {fs} from "../util/fs";
import {JsonPath} from "./jsonPath";

import path = require("path");
import util = require("util");

// decorator
export function task(selector:string) {
  return (_target: Object, methodName: string) => {
      var taskDefinitions = _target["$taskDefinitions"];
      if (taskDefinitions===undefined||taskDefinitions===null) taskDefinitions = [];
      taskDefinitions.push({methodName:methodName,selector:selector});
      _target["$taskDefinitions"]=taskDefinitions;
  }
}

export class TaskSet { $taskDefinitions: Array<{methodName:string,selector:string}>; };

export class Task {
    id:string;
    selector:string;
    action:(context:TaskExecutionContext) => any;
}

export class TaskExecutionContext {
    appDef;
    modelDef;
    currentItem;
    currentItemPath:string;
    workingDir:string;
}

export class TaskManager {
    private _tasks:Array<Task> = [];

    public add(id:string, selector:string, action:(context:TaskExecutionContext)=>any) {
        // TODO: Check if the task id already exist for the same module
        var newTask = new Task();
        newTask.id = id;
        newTask.action = action;
        newTask.selector = selector;
        this._tasks.push(newTask);
    }

    public tasks():Task[] {
        return this._tasks;
    }

    public get(id:string):Task[] {
        var foundTasks = new Array<Task>();

        for (var index = 0; index < this._tasks.length; index++) {
            var current = this._tasks[index];
            if (current.id == id) {
                foundTasks.push(current);
            }
        }
        return foundTasks;
    }

    public getByContext(itemPath:string,rootObject,currentObject):Task[] {
        var foundTasks = new Array<Task>();

        for (var index = 0; index < this._tasks.length; index++) {
            var currentTask = this._tasks[index];
            if (JsonPath.areEqual(currentTask.selector,itemPath)) {
                var found = JsonPath.find(currentTask.selector,rootObject);
                if(found==currentObject){
                  foundTasks.push(currentTask);
                }
            }
        }
        // If there are not values, return null instead of an empty array
        return foundTasks.length>0?foundTasks:null;
    }


    public runBySelector(selector:string, context:TaskExecutionContext) {
        var tasks = this.getByContext(selector,context.appDef,context.currentItem);
        if (tasks.length == 0) {
            console.log("Warning: No tasks found with id: %s", selector);
        }
        return this.runAll(tasks, context);
    }

    public runAll(tasks:Task[], context:TaskExecutionContext) {
        var promises:Array<Promise<TaskExecutionContext>> = [];
        for (var i = 0; i < tasks.length; i++) {
            var task = tasks[i];
            // This runs all the tasks in parallel
            var p = this.runTask(task, context);
            promises.push(p);
        }
        return Promise.all(promises).then<TaskExecutionContext>(x=>context);
    }

    private runTask(task:Task, context:TaskExecutionContext) {
        return new Promise<TaskExecutionContext>((resolve, reject)=> {
            //console.log("Running task %s...", task.id);
            try {
                var retVal = task.action.call(this, context);
                if (retVal && retVal instanceof Promise) {
                    // If the task has returned a Promise, means that is an asyn task
                    // So, wait until is resolved
                    var returnedPromise:Promise<any> = retVal;
                    returnedPromise
                        .then(()=> {
                            //console.log("done!");
                            resolve(context);
                        })
                        .catch(err=> {
                            // Error executing the task
                            console.log("Error executing task %s: %s", task.id, err);
                            reject(err);
                        });
                }
                else {
                    // If the task returns nothing or any other value
                    // means that is a sync task, so we can resolve it immediately
                    //console.log("done!");
                    resolve(context);
                }
            }
            catch (err) {
                // Error executing the task
                console.log("Error executing task %s: %s", task.id, err);
                reject(err);
            }
        });
    }
}
