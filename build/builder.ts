/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import path = require("path");
import jsonValidator = require('tv4');
import {Task,TaskExecutionContext,TaskManager} from "./tasks";
import {Template,TemplateExecutionContext,TemplateManager} from "./templates";

import {fs} from "../util/fs";
import {Obj} from "../util/obj";

export class Builder {

	private taskManager:TaskManager = new TaskManager();
	private templateManager:TemplateManager = new TemplateManager();
	
	constructor(private workingDir:string){
	}
	
	/**
	 * Searches for json files in installed modules, merge found objects and returns the result
	 */
	private buildJson(installedModules:Array<string>, workingDir:string, fileName:string){
		var jsonObj:any={};
		for (var i = 0; i < installedModules.length; i++) {
			var installedModule = installedModules[i];
			var jsonFileId = path.join(workingDir, "node_modules", installedModule, fileName);
			var moduleJsonObj = this.tryGetModule(jsonFileId);
			if(moduleJsonObj) {
				jsonObj = Obj.extend(jsonObj, moduleJsonObj);
			}
		}
		return jsonObj;
	}
		
	private getRoot(m:NodeModule):NodeModule{
		var root = m;
		while(root.parent) root = root.parent;
		return root;
	}
	
	private tryGetModule(moduleId:string){
		var result = null;
		try{
			result = require(moduleId);
		}catch(e){}
		
		return result;
	}

	private loadBuildTasks(installedModules:Array<string>, workingDir:string){
		for (var i = 0; i < installedModules.length; i++) {
			var installedModule = installedModules[i];
			var buildTaskModuleId = path.join(workingDir, "node_modules", installedModule, "build/buildTasks");
			var buildTaskModule = this.tryGetModule(buildTaskModuleId);
			if(buildTaskModule) {
				buildTaskModule(this.taskManager, this.templateManager);
			}
		}
	}
	
	/**
	* Builds the current object and returns a Promise
	*/
	private buildObject(context:TaskExecutionContext):Promise<TaskExecutionContext> {
		// Run the task with the specified item path
		var tasks = this.taskManager.get(context.currentItemPath);
		if (tasks) {
			return this.taskManager.runAll(tasks, context)
			.then(
				x=>this.buildProperty(context));
		}
		else {
			// There aren't any tasks for defined fot the specified item
			// so, we run the tasks for the inner objects
			return this.buildProperty(context);	
		}
	}

	
	/**
	 * Builds every property in the current Item, and returns a Promise
	 */
	private buildProperty(context:TaskExecutionContext, properties?:Array<string>,currentPropertyIndex?:number):Promise<TaskExecutionContext>{
		
		// optional parameters
		if(!properties && typeof context.currentItem == "object") properties = Object.keys(context.currentItem);
		if(!currentPropertyIndex) currentPropertyIndex = 0;
	
		if(properties && currentPropertyIndex<properties.length){
			var propName = properties[currentPropertyIndex];
			var propValue = context.currentItem[propName];
			if (propValue != null && typeof propValue == "object") {
				var currentPropPath = path.join(context.currentItemPath, propName).replace("\\", "/");
				if (Array.isArray(propValue)) {
					var arrayProp:Array<any> = propValue;
					// Copy the context, so later calls doesn't change it
					var context2 = Obj.clone(context);
					context2.currentItemPath = currentPropPath;
					// if the property is an array, build it as an array
					return this.buildArray(context2, arrayProp, 0)
					// then, build the next property
					.then(
						x=>this.buildProperty(context, properties, currentPropertyIndex+1));
				}
				else if (!(propValue instanceof Date)) { 
					// the property is a regular object
					// Copy the context, so later calls doesn't change it
					var context2 = Obj.clone(context);
					context2.currentItemPath = currentPropPath;
					context2.currentItem = propValue;
					// Build it
					return this.buildObject(context2)
					// And then, build the next property
					.then(x=>
						this.buildProperty(context, properties, currentPropertyIndex+1));
				}
			}
			else
			{
				// the property value type is a native type. Doesn't require to be built
				// Build the next property
				return this.buildProperty(context, properties, currentPropertyIndex+1)
			}
		}
		// TODO: Is this line required?
		return Promise.resolve();
	}
	
	/**
	*	Builds every element in the array and returns a Promise
	*/
	private buildArray(context:TaskExecutionContext, array:Array<any>,currentIndex:number):Promise<TaskExecutionContext>{
		if(currentIndex<array.length) {
			// The current item changes in every iteration
			// the current path remains the same. All the elements in the array share the same path
			context.currentItem = array[currentIndex];
			return this.buildObject(context)
				.then(
					x=>this.buildArray(context, array, currentIndex+1));
		}
		// TODO: Is this line required?
		return Promise.resolve();
	}
	
	private saveAppDef(context:TaskExecutionContext){
		// save the app definition to the data folder
		var destPath = path.join(context.workingDir,"/data/app.json");
		//console.log(context.appDef);
		return fs.saveJSON(context.appDef,destPath)
	}

	private saveModelDef(context:TaskExecutionContext){
		// save the app model to the data folder
		var destPath = path.join(context.workingDir,"/data/model.json");
		//console.log(context.modelDef);
		return fs.saveJSON(context.modelDef,destPath)
	}
	
	/**
	 * Validates app definition against the model definition
	 */
	private isAppDefValid(appDef, modelDef) {
	
		var isValid=false;	
		var sch:tv4.JsonSchema = modelDef;
		var validator = jsonValidator.freshApi();
		var errors = validator.validateMultiple(appDef,sch, false, true);
		
		if(!errors.valid||errors.missing.length>0){
			console.log("Error: Application definition validation KO");
			console.log(errors);
		}
		else{
			console.log("Application definition OK");
			isValid = true;
		}
		
		return isValid;
	}
	
	private validateAppDef(appDef, modelDef){
		var isValid = this.isAppDefValid(appDef, modelDef);
		if(!isValid){
			throw "Application definition is not valid";
		}
	}
	
	private handleError(error){
		console.log(error);
	}
	
	public build(): void {
		
		var appPkgId = path.join(this.workingDir,"package.json");
		var appPkg = require(appPkgId);
		var installedModules = appPkg.config.greenmouse.packages;
		
		var modelDef = this.buildJson(installedModules, this.workingDir,"model");
		var appDef = this.buildJson(installedModules, this.workingDir,"app");

		// merge with main model def
		var mainModelDefModuleId = path.join(this.workingDir, "model.json");
		var mainModelDef = this.tryGetModule(mainModelDefModuleId);
		if(mainModelDef)
			modelDef = Obj.extend(modelDef, mainModelDef);

		// merge with main app def
		var mainAppDefModuleId = path.join(this.workingDir, "app.json");
		var mainAppDef = this.tryGetModule(mainAppDefModuleId);
		if(mainAppDef)
			appDef = Obj.extend(appDef, mainAppDef);

		// validate app def against model definition
		var appDefValid = this.isAppDefValid(appDef,modelDef);
		if(appDefValid){
			
			// Load tasks...
			this.loadBuildTasks(installedModules, this.workingDir);
		
			//console.log("Tasks:");
			//console.log(this.taskManager.tasks());
		
			// load templates
			this.templateManager.getTemplates(installedModules, this.workingDir)
			.then(x=>this.templateManager.addTemplates(x))
			.then(()=>{
				
				console.log("Templates:");
				console.log(this.templateManager.templates());
				
				// After the templates finished loading...
				// begin building the app
				var context: TaskExecutionContext = { appDef:appDef, currentItem:appDef, currentItemPath:"/", 
														modelDef:modelDef, workingDir:this.workingDir};
											
				// Run the before build tasks
				this.taskManager.run("before-build", context)
				// build the app
				.then(x=>this.buildObject(context))
				// Run after build tasks
				.then(()=>this.taskManager.run("after-build",context))
				.then(()=>this.validateAppDef(context.appDef, context.modelDef))
				.then(()=>this.saveAppDef(context))
				.then(()=>this.saveModelDef(context))
				.catch(this.handleError);
			}).catch(this.handleError);			
		}
	}
}