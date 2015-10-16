/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import util = require("util");
import path = require("path");
import jsonValidator = require('tv4');
import {Task, TaskExecutionContext, TaskManager} from "./tasks";
import {Template, TemplateExecutionContext, TemplateManager} from "./templates";

import {fs} from "../util/fs";
import {Obj} from "../util/obj";

export class Builder {

    private _taskManager: TaskManager = new TaskManager();
    private _templateManager: TemplateManager = new TemplateManager();
    private _appDef: any;
    private _modelDef: any;

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

    private loadBuildTasks(installedModules: Array<string>, workingDir: string) {
        for (var i = 0; i < installedModules.length; i++) {
            var installedModule = installedModules[i];
            var buildTaskModuleId = path.join(workingDir, "node_modules", installedModule, "build/buildTasks");
            var buildTaskModule = this.tryGetModule(buildTaskModuleId);
            if (buildTaskModule) {
                buildTaskModule(this._taskManager, this._templateManager);
            }
        }
    }

	/**
	* Builds the current object and returns a Promise
	*/
    private buildObject(context: TaskExecutionContext): Promise<TaskExecutionContext> {
        // the default return value will be a resolved promise
        var returnValue: Promise<TaskExecutionContext> = Promise.resolve(context);

        // Run the task with the specified item path
        var tasks = this._taskManager.get(context.currentItemPath);
        if (tasks) {
            returnValue = this._taskManager.runAll(tasks, context)
                .then(() => this._templateManager.runTemplateOnContext(context))
                .then(() => this.buildProperty(context));
        }
        else {
            // There aren't any tasks for defined fot the specified item
            // so, we run the tasks for the inner objects
            returnValue = this._templateManager.runTemplateOnContext(context)
                .then(() => this.buildProperty(context));
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
                var currentPropPath = path.join(context.currentItemPath, propName).replace("\\", "/");
                if (Array.isArray(propValue)) {
                    var arrayProp: Array<any> = propValue;
                    // Copy the context, so later calls doesn't change it
                    var context2 = Obj.clone(context);
                    context2.currentItemPath = currentPropPath;
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
                .then(()=> this.buildArray(context, array, currentIndex + 1));
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

    public templateManager() {
        return this._templateManager;
    }

    public taskManager() {
        return this._taskManager;
    }

    /** Loads the tasks, templates, models and definitions for the current application  */
    public load() {
        var returnValue: Promise<any>;

        try {
            var appPkgId = path.join(this.workingDir, "package.json");
            var appPkg = require(appPkgId);
            var installedModules = appPkg.config.greenmouse.packages;

            console.log("installed modules:");
            console.log(installedModules);

            console.log("loading model...");
            this._modelDef = this.buildJson(installedModules, this.workingDir, "model");

            console.log("loading app def...");
            this._appDef = this.buildJson(installedModules, this.workingDir, "app");

            console.log("merging data...");
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

            console.log("validating schema...");
            // validate app def against model definition
            var schemaErrors = this.getSchemaErrors(this._appDef, this._modelDef);
            if (!schemaErrors) {

                console.log("loading tasks...");
                // Load tasks...
                this.loadBuildTasks(installedModules, this.workingDir);

                console.log("loading templates...");
                // load templates
                returnValue = this._templateManager.getTemplates(installedModules, this.workingDir)
                    .then(x=> this._templateManager.addTemplates(x));
            }
            else {
                var error = new Error(util.format("Error validating app schema\nErrors:%s", schemaErrors));
                returnValue = Promise.reject(error);
            }
        }
        catch (err) {
            returnValue = Promise.reject(err);
        }

        return returnValue;
    }

    public build() {

        var returnValue: Promise<any>;

        // begin building the app
        var context: TaskExecutionContext = {
            appDef: this._appDef, currentItem: this._appDef, currentItemPath: "app",
            modelDef: this._modelDef, workingDir: this.workingDir
        };
        returnValue = this._taskManager.run("before-build", context) // Run the before build tasks
            .then(() => this.buildObject(context)) // Navigate the objects in the appDef and execute templates and tasks for each item
            .then(() => this._taskManager.run("after-build", context)) // Run after build tasks
            .then(() => this.validateAppDef(context.appDef, context.modelDef)) // Validate changes in the appDef
            .then(() => this.saveAppDef(context)) // Persist the appDef
            .then(() => this.saveModelDef(context)) // Persist the modelDeg
            .catch(this.handleError);

        return returnValue;
    }
}
