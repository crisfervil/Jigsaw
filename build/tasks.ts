/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import path = require("path");
import {fs} from "../util/fs";
import util = require("util");

export class Task {
    id:string;
    module:string;
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

    public add(id, action:(context:TaskExecutionContext)=>any) {
        // TODO: Check if the task id already exist for the same module
        var newTask = new Task();
        newTask.id = id;
        newTask.action = action;
        this._tasks.push(newTask);
    }

    public tasks() {
        return this._tasks;
    }

    public get(id:string):Array<Task> {
        var task:Array<Task> = [];

        for (var index = 0; index < this._tasks.length; index++) {
            var current = this._tasks[index];
            if (current.id == id) {
                task.push(current);
            }
        }
        return task;
    }

    public run(id:string, context:TaskExecutionContext) {
        var tasks = this.get(id);
        if (tasks.length == 0) {
            console.log("Warning: No tasks found with id: %s", id);
        }
        return this.runAll(tasks, context);
    }

    public runAll(tasks:Task[], context:TaskExecutionContext) {
        var promises:Array<Promise<TaskExecutionContext>> = [];
        for (var i = 0; i < tasks.length; i++) {
            var task = tasks[i];
            var p = this._run(task, context);
            promises.push(p);
        }
        return Promise.all(promises).then<TaskExecutionContext>(x=>context);
    }

    private _run(task:Task, context:TaskExecutionContext) {
        return new Promise<TaskExecutionContext>((resolve, reject)=> {
            console.log("Running task %s...", task.id);
            try {
                var retVal = task.action.call(this, context);
                if (retVal && retVal instanceof Promise) {
                    // If the task has returned a Promise, means that is an asyn task
                    // So, wait until is resolved
                    var returnedPromise:Promise<any> = retVal;
                    returnedPromise
                        .then(()=> {
                            console.log("done!");
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
                    console.log("done!");
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
