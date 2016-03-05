/// <reference path="../typings/main.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import util = require("util");
import path = require("path");
import jsonValidator = require('tv4');

import {Task, TaskSet, TaskExecutionContext, TaskManager} from "./tasks";
import {Template, TemplateExecutionContext, TemplateManager} from "./templates";

import {fs} from "../util/fs";
import {Obj} from "../util/obj";

export class Builder {

    private _taskManager: TaskManager = new TaskManager();
    private _templateManager: TemplateManager = new TemplateManager();
    private _appDef: any;
    private _modelDef: any;

    installedModules: string[] = [];

    constructor(private workingDir: string) {
    }

    /**
    * Searches for json files in installed modules, merge found objects and returns the result
    */
    private buildJson(installedModules: Array<string>, workingDir: string, fileName: string) {
        var jsonObj: any = {};
        for (var i = 0; i < installedModules.length; i++) {
            var installedModule = installedModules[i];
            var jsonFileId = path.join(workingDir, "node_modules", installedModule, fileName);
            var moduleJsonObj = this.tryGetModule(jsonFileId);
            if (moduleJsonObj) {
                jsonObj = Obj.extend(jsonObj, moduleJsonObj);
            }
        }
        return jsonObj;
    }

    private getRoot(m: NodeModule): NodeModule {
        var root = m;
        while (root.parent) root = root.parent;
        return root;
    }

    private tryGetModule(moduleId: string) {
        var result = null;
        try {
            result = require(moduleId);
        } catch (e) { }

        return result;
    }

    private loadTaskSet(taskModule: TaskSet, moduleName:string) {
        if (taskModule.$taskDefinitions !== undefined) {
            for (var taskItem of taskModule.$taskDefinitions) {
                var taskId = path.join(moduleName,taskItem.methodName);
                this._taskManager.add(taskId, taskItem.selector, taskModule[taskItem.methodName]);
            }
        }
    }

    private loadTaskModule(taskModule, moduleName:string) {
        if (taskModule instanceof TaskSet) {
            this.loadTaskSet(taskModule, moduleName);
        }
        else if (typeof taskModule == "object") { // loading tasks from a module
            for (var propName in taskModule) {
                var propValue = taskModule[propName];
                if (typeof propValue === "function") {
                    var propValueInstance = new propValue();
                    if (propValueInstance instanceof TaskSet) {
                        var thisModuleName = path.join(moduleName,propName);
                        this.loadTaskSet(propValueInstance, thisModuleName);
                    }
                }
            }
        }
    }

    private loadBuildTasks(installedModules: Array<string>, workingDir: string) {
        for (var i = 0; i < installedModules.length; i++) {
            var installedModule = installedModules[i];
            var taskModuleId = path.join(workingDir, "node_modules", installedModule, "tasks");
            var taskModule = this.tryGetModule(taskModuleId);
            if (taskModule) {
                this.loadTaskModule(taskModule, installedModule);
            }
        }
    }

  	/**
  	* Builds the current object and returns a Promise
  	*/
    public buildObject(context: TaskExecutionContext): Promise<TaskExecutionContext> {
        // the default return value will be a resolved promise
        var returnValue: Promise<TaskExecutionContext> = Promise.resolve(context);

        // Run the task with the specified item path
        var tasks = this._taskManager.getByContext(context.currentItemPath,context.appDef,context.currentItem);
        if (tasks) {
            returnValue = this._taskManager.runAll(tasks, context)
                .then(() =>
                          this._templateManager.runTemplateOnContext(context))
                .then(() =>
                          this.buildProperty(context));
        }
        else {
            // There aren't any tasks for defined fot the specified item
            // so, we run the tasks for the inner objects
            returnValue = this._templateManager.runTemplateOnContext(context)
                .then(() =>
                          this.buildProperty(context));
        }
        return returnValue;
    }

    /**
    * Builds every property in the current Item, and returns a Promise
    */
    private buildProperty(context: TaskExecutionContext, properties?: Array<string>, currentPropertyIndex?: number): Promise<TaskExecutionContext> {

        // the default return value will be a resolved promise
        var returnValue: Promise<TaskExecutionContext> = Promise.resolve(context);

        // optional parameters
        if (!properties && typeof context.currentItem == "object") {
            properties = Object.keys(context.currentItem);
        }
        if (!currentPropertyIndex) {
            currentPropertyIndex = 0;
        }

        if (properties && currentPropertyIndex < properties.length) {
            var propName = properties[currentPropertyIndex];
            var propValue = context.currentItem[propName];

            if (propValue != null && typeof propValue == "object") {
                var currentPropPath = path.join(context.currentItemPath, propName).replace(/\\/g, "/");
                if (Array.isArray(propValue)) {
                    var arrayProp: Array<any> = propValue;
                    // Copy the context, so later calls doesn't change it
                    var context2 = Obj.clone(context);
                    context2.currentItemPath = currentPropPath+"[]";
                    // if the property is an array, build it as an array
                    returnValue = this.buildArray(context2, arrayProp, 0)
                        .then(() => this.buildProperty(context, properties, currentPropertyIndex + 1)); // then, build the next property
                }
                else if (!(propValue instanceof Date)) { // The Date objects are typeof == "object" too
                    // the property is a regular object
                    // Copy the context, so if a later call changes it, it doesn't affect the execution
                    var context2 = Obj.clone(context);
                    context2.currentItemPath = currentPropPath;
                    context2.currentItem = propValue;
                    // Build it
                    returnValue = this.buildObject(context2)
                        .then(() => this.buildProperty(context, properties, currentPropertyIndex + 1)); // then, build the next property
                }
            }
            else {
                // the property value type is a native type. Doesn't require to be built
                returnValue = this.buildProperty(context, properties, currentPropertyIndex + 1); // Build the next property
            }
        }

        return returnValue;
    }

  	/**
  	*	Builds every element in the array and returns a Promise
  	*/
    private buildArray(context: TaskExecutionContext, array: Array<any>, currentIndex: number): Promise<TaskExecutionContext> {

        // the default return value will be a resolved promise
        var returnValue: Promise<TaskExecutionContext> = Promise.resolve(context);

        if (currentIndex < array.length) {
            // The current item changes in every iteration
            // the current path remains the same. All the elements in the array share the same path
            context.currentItem = array[currentIndex];
            return this.buildObject(context)
                .then(() => this.buildArray(context, array, currentIndex + 1));
        }

        return returnValue;
    }

    private saveAppDef(context: TaskExecutionContext) {
        // save the app definition to the data folder
        var destPath = path.join(context.workingDir, "/data/app.json");
        //console.log(context.appDef);
        return fs.saveJSON(context.appDef, destPath)
    }

    private saveModelDef(context: TaskExecutionContext) {
        // save the app model to the data folder
        var destPath = path.join(context.workingDir, "/data/model.json");
        //console.log(context.modelDef);
        return fs.saveJSON(context.modelDef, destPath)
    }

    /**
    * Validates a Json object against a model definition. Returns found errors.
    */
    private getSchemaErrors(jsonObj, jsonSchema) {
        var errorsStr: string;
        var isValid = false;
        var sch: tv4.JsonSchema = jsonSchema;
        var validator = jsonValidator.freshApi();
        var errors = validator.validateMultiple(jsonObj, sch, false, true);

        if (!errors.valid || errors.missing.length > 0) {
            errorsStr = JSON.stringify(errors, null, 3);
        }

        return errorsStr;
    }

    private validateAppDef(appDef, modelDef) {
        var errors = this.getSchemaErrors(appDef, modelDef);
        if (errors) {
            throw "Application definition is not valid\n" + errors;
        }
    }

    private handleError(error) {
        console.log(error);
    }

    get templateManager() {
        return this._templateManager;
    }

    get taskManager() {
        return this._taskManager;
    }

    get appDef() {
        return this._appDef;
    }

    set appDef(value) {
        this._appDef=value;
    }

    public modelDef() {
        return this._modelDef;
    }

    /** Loads the tasks, templates, models and definitions for the current application  */
    public load(): Promise<any> {
        var returnValue: Promise<any>;

        try {
            var appPkgId = path.join(this.workingDir, "package.json");
            var appPkg = this.tryGetModule(appPkgId);

            if (appPkg && appPkg.config && appPkg.config.greenmouse && appPkg.config.greenmouse.packages) {
                this.installedModules = appPkg.config.greenmouse.packages;
            }

            this._modelDef = this.buildJson(this.installedModules, this.workingDir, "model");
            this._appDef = this.buildJson(this.installedModules, this.workingDir, "app");

            // merge with main model def
            var mainModelDefModuleId = path.join(this.workingDir, "model.json");
            var mainModelDef = this.tryGetModule(mainModelDefModuleId);
            if (mainModelDef)
                this._modelDef = Obj.extend(this._modelDef, mainModelDef);

            // merge with main app def
            var mainAppDefModuleId = path.join(this.workingDir, "app.json");
            var mainAppDef = this.tryGetModule(mainAppDefModuleId);
            if (mainAppDef)
                this._appDef = Obj.extend(this._appDef, mainAppDef);

            // validate app def against model definition
            var schemaErrors = this.getSchemaErrors(this._appDef, this._modelDef);
            if (schemaErrors != null) {
                var error = new Error(util.format("Error validating app schema\nErrors:%s", schemaErrors));
                returnValue = Promise.reject(error);
            }
            else {
                // Load tasks...
                this.loadBuildTasks(this.installedModules, this.workingDir);

                // load templates
                returnValue = this._templateManager.getTemplates(this.installedModules, this.workingDir)
                    .then(x=> this._templateManager.addRange(x));
            }
        }
        catch (err) {
            returnValue = Promise.reject(err);
        }

        return returnValue;
    }

    public build() {
        var returnValue: Promise<any>;

        // prepare the first execution context
        var context: TaskExecutionContext = {
            appDef: this._appDef, currentItem: this._appDef, currentItemPath: "app",
            modelDef: this._modelDef, workingDir: this.workingDir
        };
        // begin building the app
        returnValue = this._taskManager.runBySelector("before-build", context) // Run the before build tasks
            .then(() => this.buildObject(context)) // Navigate the objects in the appDef and execute templates and tasks for each item
            .then(() => this._taskManager.runBySelector("after-build", context)) // Run after build tasks
            .then(() => this.validateAppDef(context.appDef, context.modelDef)) // Validate changes in the appDef
            .then(() => this.saveAppDef(context)) // Persist the appDef
            .then(() => this.saveModelDef(context)) // Persist the modelDef
            .catch(this.handleError);

        return returnValue;
    }
}
