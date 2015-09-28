/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import path = require("path");
import fs = require("fs");
import ejs = require("ejs");
import {gm_fs}  from "../util/fs"

export class Task {
	name: string;
	mod: string;
	action: (rootPath:string, appDef, element) => any;
}

export class Template {
	id: string;
	fullPath:string;
	module:string;
}

export class Builder {

	private _tasks: Array<Task> = [];
	public _templates: Array<Template> = [];

	public task(eventName, action:(rootPath:string, appDef, element?) => any): void {
		// TODO: Check if the task already exist
		var newTask = new Task();
		newTask.name=eventName;
		newTask.action=action;
		this._tasks.push(newTask);
	}

	public getTaskByName(name: string): Task {
		var task: Task = null;

		for (var index = 0; index < this._tasks.length; index++) {
			var current = this._tasks[index];
			if (current.name == name) {
				task = current;
				break;
			}
		}
		return task;
	}

	public runTask(taskName: string, rootPath:string, appDef, appElement): void {
		var task = this.getTaskByName(taskName);
		this.run(task, rootPath, appDef, appElement);
	}

	public runTaskIfExists(taskName: string, rootPath:string, appDef, appElement): void {
		var task = this.getTaskByName(taskName);
		if (task != null) this.run(task, rootPath, appDef, appElement);
	}

	private run(task: Task, rootPath:string, appDef, appElement): void {
		console.log("Running task [%s]...", task.name);
		task.action(rootPath, appDef, appElement);
		console.log("done");
	}
	
	private getRoot(m:NodeModule):NodeModule{
		var root = m;
		while(root.parent) root = root.parent;
		return root;
	}
	
	private tryGetModule(moduleId:string, m?:NodeModule){
		var result = null;
		if(!m) m=module;
		try{
			result = m.require(moduleId);
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
		return new Promise<NodeJS.ErrnoException>((resolve, reject)=>{
			fs.writeFile(path, obj, error=> {if(error)reject(error); else resolve();});	
		});
	}


	private saveJSON(obj, path:string){
		var objStr = JSON.stringify(obj, null, 4);
		return this.fs_writeFile(obj,path);
	}

	private buildAppDef(installedModules:Array<string>, rootModule:NodeModule){
		var appDef={};
		for (var i = 0; i < installedModules.length; i++) {
			var installedModule = installedModules[i];
			var appDefModuleId = path.join(installedModule, "app").replace("\\","/");
			var moduleAppDef = this.tryGetModule(appDefModuleId, rootModule);
			if(moduleAppDef) {
				appDef = this.extend(appDef, moduleAppDef);
			}
		}
		return appDef;
	}
	
	private loadBuildTasks(installedModules:Array<string>, rootModule:NodeModule){
		for (var i = 0; i < installedModules.length; i++) {
			var installedModule = installedModules[i];
			var buildTaskModuleId = path.join(installedModule, "build/buildTasks").replace("\\","/");
			var buildTaskModule = this.tryGetModule(buildTaskModuleId, rootModule);
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

	
	private getTemplatesFromDir(moduleName:string, dirPath:string){
		return new Promise<Template[]>(resolve=>{
			var templates = new Array<Template>();
			this.fs_exists(dirPath).then(exists=>{
				if(exists){
					this.fs_readdir(dirPath).then(files=>{
						for (var i = 0; i < files.length; i++) {
							var templateFile = files[i];
							var template = new Template();
							template.id = templateFile;
							template.fullPath = path.join(dirPath, templateFile);
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
	
	private getTemplates(installedModules:Array<string>, rootPath:string){
		var promises = new Array<Promise<Template[]>>();
		// TODO: Make it recursive
		for (var i = 0; i < installedModules.length; i++) {
			var installedModule = installedModules[i];
			var templatesModuleDir = path.join(rootPath, "node_modules", installedModule, "templates");
			promises.push(this.getTemplatesFromDir(installedModule,templatesModuleDir));
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
	
	private getTemplateContent(id:string){
		return new Promise<string>((resolve,reject)=>{
			var template = this.getTemplate(id);
			if(template){
				this.fs_readFile(template.fullPath).then(data=>{
					resolve(data.toString());
				})
				.catch(error=>reject(error));
			}
			else{
				reject("template not found");
			}
		});
	}

	public runTemplateIfExists(templateId:string,appDef, item, destPath:string){
		// http://ejs.co/

		this.getTemplateContent(templateId).then(content=>{
			var result = ejs.render(content,{item:item, appDef:appDef});
			gm_fs.mkdirP(path.dirname(destPath), error=>{
				if(!error)
					this.fs_writeFile(result,destPath).catch(error=>console.log(error));
				else
					console.log(error);
			});
			
		});
	}

	public build(): void {
		
		var rootModule = this.getRoot(module);
		var rootPath = path.dirname(rootModule.filename);
		var appPkg = rootModule.require("./package");
		var installedModules = appPkg.config.platypus.packages;
		var appDef = this.buildAppDef(installedModules, rootModule);
		
		// merge with main app def
		var mainAppDef = this.tryGetModule("./app.json", rootModule);
		if(mainAppDef)
			appDef = this.extend(appDef, mainAppDef);

		this.saveJSON(appDef,path.join(rootPath,"/data/app.json"));
	
		this.loadBuildTasks(installedModules, rootModule);
	
		// load templates
		this.getTemplates(installedModules, rootPath).then((templates)=>{
			this._templates = this._templates.concat(templates);
		}).then(c=>{
			// execute tasks for each app def item
			this.buildItem(rootPath, appDef, "/", appDef);
		});
		
	}

	private buildItem(rootPath:string, appDef, currentPath: string, currentAppElement): void {

		// Run the task
		var task: Task = this.getTaskByName(currentPath);
		if (task) this.run(task, rootPath, appDef, currentAppElement);
	
	
		// Iterate trhough object properties (app def elements)
		for (var propName in currentAppElement) {
			var propValue = currentAppElement[propName];
			if (propValue != null && typeof propValue == "object") {
				var currentPropPath = path.join(currentPath, propName).replace("\\", "/");
				console.log(currentPropPath);
				if (Array.isArray(propValue)) {
					for (var index = 0; index < propValue.length; index++) {
						var arrayItem = propValue[index];
						this.buildItem(rootPath, appDef, currentPropPath, arrayItem);
					}
				}
				else {
					// TODO: avoid date instanceof Date
					this.buildItem(rootPath,appDef, currentPropPath, propValue);
				}
			}
		}
	}
}

export var instance: Builder = new Builder();
