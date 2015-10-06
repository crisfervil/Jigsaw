/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import path = require("path");
import jsonValidator = require('tv4');
import {Task,Template,ExecutionContext,TaskManager} from "./tasks";
import {fs} from "../util/fs";
import {Obj} from "../util/obj";

export class Builder {

	private taskManager:TaskManager = new TaskManager();
	
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
				buildTaskModule(this.taskManager);
			}
		}
	}

	private getTemplatesFromModule(moduleName:string, workingDir:string){
		return new Promise<Template[]>(resolve=>{
			var dirPath = path.join(workingDir, "node_modules", moduleName, "templates");
			var templates = new Array<Template>();
			fs.exists(dirPath).then(exists=>{
				if(exists){
					fs.readdir(dirPath).then(files=>{
						for (var i = 0; i < files.length; i++) {
							var templateFile = files[i];
							var template = new Template();
							
							var templateExt = path.extname(templateFile);
							if(templateExt){
								template.id = templateFile.substr(0, templateFile.length - templateExt.length);
							}
							else{
								template.id = templateFile;	
							}
							
							template.path = path.relative(path.join(workingDir, "node_modules", moduleName), 
															path.join(dirPath, templateFile));
							template.module = moduleName;
							templates.push(template);
						}
						resolve(templates);
					})
				}
				else{
					resolve([]);
				}
			})
		});
	}
	
	private getTemplates(installedModules:Array<string>, workingDir:string){
		var promises = new Array<Promise<Template[]>>();
		// TODO: Make it recursive
		for (var i = 0; i < installedModules.length; i++) {
			var moduleName = installedModules[i];
			promises.push(this.getTemplatesFromModule(moduleName,workingDir));
		}
		return new Promise<Template[]>(resolve=>Promise.all(promises).then(allTemplates=>{
			var templates = new Array<Template>();
			for (var i = 0; i < allTemplates.length; i++) {
				templates = templates.concat(allTemplates[i]);
			}
			resolve(templates);	
		}));
	}	
	
	/**
	* Builds the current object and returns a Promise
	*/
	private buildObject(context:ExecutionContext):Promise<{}> {
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
	private buildProperty(context:ExecutionContext, properties?:Array<string>,currentPropertyIndex?:number):Promise<{}>{
		
		// optional parameters
		if(!properties) properties = Object.keys(context.currentItem);
		if(!currentPropertyIndex) currentPropertyIndex = 0;
				
		if(currentPropertyIndex<properties.length){
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
		return Promise.resolve();
	}
	
	/**
	*	Builds every element in the array and returns a Promise
	*/
	private buildArray(context:ExecutionContext, array:Array<any>,currentIndex:number):Promise<{}>{
		if(currentIndex<array.length) {
			// The current item changes in every iteration
			// the current path remains the same. All the elements in the array share the same path
			context.currentItem = array[currentIndex];
			return this.buildObject(context)
				.then(
					x=>this.buildArray(context, array, currentIndex+1));
		}
		return Promise.resolve();
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

		// save the app definition to the data folder
		var appDefDestPath = path.join(this.workingDir,"/data/app.json");
		
		//TODO: create a Promised version of mkdirP
		fs.mkdirP(path.dirname(appDefDestPath),error=>{
			if(!error)
				fs.saveJSON(appDef,appDefDestPath);
			else
				throw error;
		});
		
		// save the app definition to the data folder
		var modelDefDestPath = path.join(this.workingDir,"/data/model.json");
		
		fs.mkdirP(path.dirname(modelDefDestPath),error=>{
			if(!error)
				fs.saveJSON(modelDef,modelDefDestPath)
				.catch(error=>console.log(error));
			else
				throw error;
		});

		//console.log(modelDef);
		//console.log(appDef);
		
		// validate app def against model definition
		console.log("Validating app def...");
		var sch:tv4.JsonSchema = modelDef;
		var errors = jsonValidator.validateMultiple(appDef,sch, false, true);
		
		if(!errors.valid||errors.missing.length>0){
			console.log("Errors:");
			console.log(errors);
		}
		else{
			console.log("Valid");
			
			// Load tasks...
			this.loadBuildTasks(installedModules, this.workingDir);
		
			console.log("Tasks:");
			console.log(this.taskManager.tasks());
		
			// load templates
			this.getTemplates(installedModules, this.workingDir).then((templates)=>{
				templates.forEach(t=>this.taskManager.addTemplate(t))
			}).then(c=>{
				
				console.log("Templates:");
				console.log(this.taskManager.templates());
				
				// After the templates finished loading...
				// begin building the app
				var context: ExecutionContext = { appDef:appDef, currentItem:appDef, currentItemPath:"/", 
											modelDef:modelDef, workingDir:this.workingDir};
				this.buildObject(context);
			});			
			
		}
	}
	
	
}