/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import path = require("path");
import fs = require("fs");
import ejs = require("ejs");
import {gm_fs}  from "../util/fs"
import jsonValidator = require('tv4');

export class Task {
	id: string;
	module: string;
	action: (appDef, element) => any;
}

export class Template {
	id: string;
	path:string;
	module:string;
}

export class Builder {

	private _tasks: Array<Task> = [];
	private _templates: Array<Template> = [];
	private _workingDir:string;
	
	constructor(workingDir?:string){
		this._workingDir = workingDir;
	}

	public task(eventName, action:(appDef, element?) => any): void {
		// TODO: Check if the task already exist
		var newTask = new Task();
		newTask.id=eventName;
		newTask.action=action;
		this._tasks.push(newTask);
	}

	public getTasksById(id: string): Array<Task> {
		var task: Array<Task> = [];

		for (var index = 0; index < this._tasks.length; index++) {
			var current = this._tasks[index];
			if (current.id == id) {
				task.push(current);
			}
		}
		return task;
	}

	public runTask(taskName: string, appDef, appElement) {
		var tasks = this.getTasksById(taskName);
		return this.runAll(tasks,appDef,appElement);
	}

	private runAll(tasks: Task[], appDef, appElement) {
		var promises : Array<Promise<any>> = [];
		for (var i = 0; i < tasks.length; i++) {
			var task = tasks[i];
			var p = this.run(task, appDef, appElement);
			promises.push(p);
		}
		return Promise.all(promises);
	}

	private run(task: Task, appDef, appElement) {
		return new Promise((resolve, reject)=>{
			console.log("Running task %s...", task.id);
			try {
				var retVal = task.action.call(this, appDef, appElement);
				if(retVal&&retVal instanceof Promise){
						var rv:Promise<any> = retVal;
						rv
						.then(x=>resolve(rv))
						.catch(err=>{
							// Error executing the task
							console.log("Error executing task %s: %s", task.id, err);
							reject(err);});
				}
				else{
					resolve();
					console.log("done!");
				}
			}
			catch (err){
				// Error executing the task
				console.log("Error executing task %s: %s", task.id, err);
				reject(err);				
			}
		});
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
	
	private extend(object1, object2):any{

		if (!object1 || (object2 && typeof object2 != "object")){
			// merge non object values
			object1=object2;
		}
		else
		{
			// merge objects
			for(var propName in object2){
				var obj1PropValue = object1[propName];
				var obj2PropValue = object2[propName];
				if(obj2PropValue) {
					if(!obj1PropValue)
					{
						// the property doesn't exist in obj1
						object1[propName] = obj2PropValue;
					}
					else {
						if (typeof obj2PropValue == "object"){
							if(typeof obj1PropValue != "object"){
								//Trying to merge different types of objects
								object1[propName] = obj2PropValue
							}
							else{
								if(Array.isArray(obj2PropValue))
								{
									if(!Array.isArray(obj1PropValue))
									{
										//Trying to merge different types of objects
										object1[propName] = obj2PropValue
									}
									else {
										for (var i = 0; i < obj2PropValue.length; i++) {
											obj1PropValue.push(obj2PropValue[i]);
										}
									}
								}
								else{
									// merge two non array obects
									object1[propName] = this.extend(obj1PropValue, obj2PropValue);
								}							
							}
						}
						else {
							object1[propName] = obj2PropValue;
						}
					}
				}
			}
		}
		return object1;
	}

	private fs_writeFile(obj,path:string){
		return new Promise((resolve, reject)=>{
			fs.writeFile(path, obj, error=> {if(error)reject(error); else resolve();});	
		});
	}

	private saveJSON(obj, path:string){
		var objStr = JSON.stringify(obj, null, 4);
		return this.fs_writeFile(objStr,path);
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
				jsonObj = this.extend(jsonObj, moduleJsonObj);
			}
		}
		return jsonObj;
	}
	
	private loadBuildTasks(installedModules:Array<string>, workingDir:string){
		for (var i = 0; i < installedModules.length; i++) {
			var installedModule = installedModules[i];
			var buildTaskModuleId = path.join(workingDir, "node_modules", installedModule, "build/buildTasks");
			var buildTaskModule = this.tryGetModule(buildTaskModuleId);
			if(buildTaskModule) {
				buildTaskModule(this);
			}
		}
	}
	
	private fs_exists(path:string):Promise<boolean>{
		return new Promise<boolean>(resolve=>{
			fs.exists(path, x=>resolve(x))
		});
	}
	
	private fs_readdir(path:string){
		return new Promise<string[]>((resolve,reject)=>{
			fs.readdir(path,(err,files)=>{
				if(err){
					reject(err);
				}else{
					resolve(files);
				}
			});
		});
	}

	private fs_readFile(path:string){
		return new Promise<Buffer>((resolve,reject)=>{
			fs.readFile(path,(err,data)=>{
				if(err){
					reject(err);
				}else{
					resolve(data);
				}
			});
		});
	}

	private getTemplatesFromModule(moduleName:string, workingDir:string){
		return new Promise<Template[]>(resolve=>{
			var dirPath = path.join(workingDir, "node_modules", moduleName, "templates");
			var templates = new Array<Template>();
			this.fs_exists(dirPath).then(exists=>{
				if(exists){
					this.fs_readdir(dirPath).then(files=>{
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

	private getTemplate(id:string):Template{
		var template:Template=null;
		for (var i = 0; i < this._templates.length; i++) {
			var currentTemplate = this._templates[i];
			if(currentTemplate.id==id){
				template=currentTemplate;
				break;
			}
		}
		return template;
	}
	
	private getTemplateContent(template:Template, workingDir:string){
		return new Promise<string>((resolve,reject)=>{
			var templatePath = path.join(workingDir,"node_modules", template.module,template.path);
			this.fs_readFile(templatePath).then(data=>{
				resolve(data.toString());
			})
			.catch(error=>{reject(error);});
		});
	}

	public runTemplate(templateId:string,appDef, item, destPath?:string){
		return new Promise((resolve, reject)=>{
			var template = this.getTemplate(templateId);
			this.getTemplateContent(template, this._workingDir)
			.then(content=>{
				
				var resultOutputPath = null;
				var templateParams = {item:item, appDef:appDef, output:(x)=>resultOutputPath=x};
				
				// render the template using ejs
				// TODO: Allow other template engines
				var result = ejs.render(content,templateParams);
				
				if(resultOutputPath) destPath = resultOutputPath;
				if(!path.isAbsolute(destPath)){
					// TODO: Change the working dir for the output dir
					destPath = path.join(this._workingDir, destPath);
				} 
				gm_fs.mkdirP(path.dirname(destPath), error=>{
					if(!error)
						this.fs_writeFile(result,destPath)
						.then(resolve)
						.catch(error=>reject(error));
					else
						reject(error);
				});
			})
			.catch(error=>reject(error));
		});
	}
	
	public build(): void {
		
		var appPkgId = path.join(this._workingDir,"package.json");
		var appPkg = require(appPkgId);
		var installedModules = appPkg.config.greenmouse.packages;
		
		var modelDef = this.buildJson(installedModules, this._workingDir,"model");
		var appDef = this.buildJson(installedModules, this._workingDir,"app");

		// merge with main model def
		var mainModelDefModuleId = path.join(this._workingDir, "model.json");
		var mainModelDef = this.tryGetModule(mainModelDefModuleId);
		if(mainModelDef)
			modelDef = this.extend(modelDef, mainModelDef);

		// merge with main app def
		var mainAppDefModuleId = path.join(this._workingDir, "app.json");
		var mainAppDef = this.tryGetModule(mainAppDefModuleId);
		if(mainAppDef)
			appDef = this.extend(appDef, mainAppDef);

		// save the app definition to the data folder
		var appDefDestPath = path.join(this._workingDir,"/data/app.json");
		
		//TODO: create a Promised version of mkdirP
		gm_fs.mkdirP(path.dirname(appDefDestPath),error=>{
			if(!error)
				this.saveJSON(appDef,appDefDestPath);
			else
				throw error;
		});
		
		// save the app definition to the data folder
		var modelDefDestPath = path.join(this._workingDir,"/data/model.json");
		
		gm_fs.mkdirP(path.dirname(modelDefDestPath),error=>{
			if(!error)
				this.saveJSON(modelDef,modelDefDestPath)
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
			this.loadBuildTasks(installedModules, this._workingDir);
		
			console.log("Tasks:");
			console.log(this._tasks);
		
			// load templates
			this.getTemplates(installedModules, this._workingDir).then((templates)=>{
				this._templates = this._templates.concat(templates);
			}).then(c=>{
				
				console.log("Templates:");
				console.log(this._templates);
				
				// After the templates finished loading...
				// begin building the app
				this.buildApp(appDef);
			});			
			
		}
		
		
	}

	private buildApp(appDef:any):Promise<any>{
		return this.buildItem(appDef, "/", appDef);		
	}

	private buildItem(appDef, currentPath: string, currentAppElement):Promise<any> {
		// Run the task
		var tasks = this.getTasksById(currentPath);
		if (tasks) {
			return this.runAll(tasks, appDef, currentAppElement)
			.then(
				x=>this.buildItemChildren(appDef, currentPath, currentAppElement));
		}
		else {
			return this.buildItemChildren(appDef, currentPath, currentAppElement);	
		}
	}
	
	private buildItemChildren(appDef, currentPath: string, currentAppElement):Promise<any>{
		// Iterate trhough object properties (app def elements)
		var objProps = Object.keys(currentAppElement);
		return this.buildItemProperty(appDef,currentPath,currentAppElement,objProps,0);
	}
	
	private buildItemProperty(appDef, currentPath: string, object, propsArray:Array<string>,currentPropIndex:number):Promise<any>{
		if(currentPropIndex<propsArray.length){
			var propName = propsArray[currentPropIndex];
			var propValue = object[propName];
			if (propValue != null && typeof propValue == "object") {
				var currentPropPath = path.join(currentPath, propName).replace("\\", "/");
				if (Array.isArray(propValue)) {
					var arrayProp:Array<any> = propValue;
					return this.buildItemArray(appDef, currentPropPath, arrayProp, 0)
					.then(x=>this.buildItemProperty(appDef,currentPath, object, propsArray, currentPropIndex+1));
				}
				else if (!(propValue instanceof Date)) {
					return this.buildItem(appDef, currentPropPath, propValue)
					.then(x=>this.buildItemProperty(appDef,currentPath, object, propsArray, currentPropIndex+1));
				}
			}
			else
			{
				return this.buildItemProperty(appDef,currentPath, object, propsArray, currentPropIndex+1)
			}
		}
	}
	
	private buildItemArray(appDef, currentPath: string, array:Array<any>,currentIndex:number):Promise<any>{
		if(currentIndex<array.length) {
			return this.buildItem(appDef, currentPath, array[currentIndex])
					.then(x=>this.buildItemArray(appDef, currentPath, array, currentIndex+1));
		}
	}
}