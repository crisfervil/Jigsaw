/// <reference path="../typings/tsd.d.ts" />
import * as path from "path";
import * as fs from "fs";

export class Task {
	name: string;
	action: (rootPath:string, appDef, element) => any;
}

export class Template {
	id: string;
}

export class Builder {

	private _tasks: Array<Task> = [];
	private _templates: Array<Template> = [];

	public task(eventName, action:(rootPath:string, appDef, element?) => any): void {
		// TODO: Check if the task already exist
		this._tasks.push({ name: eventName, action: action });
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

	private saveJSON(obj, path:string){
		var objStr = JSON.stringify(obj, null, 4);
		fs.writeFile(path, objStr);
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
	
	private loadBuildTasks(installedModules:Array<string>, rootModule:NodeModule, builder:Builder){
		for (var i = 0; i < installedModules.length; i++) {
			var installedModule = installedModules[i];
			var buildTaskModuleId = path.join(installedModule, "build/buildTasks").replace("\\","/");
			var buildTaskModule = this.tryGetModule(buildTaskModuleId, rootModule);
			if(buildTaskModule) {
				buildTaskModule(builder);
			}
		}
	}
	
	
	private getTemplates(installedModules:Array<string>, rootModule:NodeModule){
		return new Promise<Array<Template>>((resolve, reject)=>{
			// TODO: Make it recursive
			var templates = new Array<Template>();
			for (var i = 0; i < installedModules.length; i++) {
				var installedModule = installedModules[i];
				var rootModuleDir = path.dirname(rootModule.filename);
				var templatesModuleDir = path.join(rootModuleDir, "node_modules", installedModule, "templates");
				((dirPath)=>{
					fs.exists(dirPath,function(exists){
					if(exists){
						fs.readdir(dirPath, function(err, files){
							if(!err){
								for (var j = 0; j < files.length; j++) {
									var templateFile = files[j];
									var template = new Template();
									template.id = templateFile;
									templates.push(template);
									console.log(templateFile);
								}
							}
						});					
					}
				})})(templatesModuleDir);
		}});
	}	

	public runTemplateIfExists(templateId:string,appDef, item, destPath:string){
		// http://ejs.co/
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
	
		this.loadBuildTasks(installedModules, rootModule, instance);
	
		// load templates
		this.getTemplates(installedModules, rootModule).then((templates)=>this._templates = this._templates.concat(templates));
		
	
		// execute tasks for each app def item
		this.buildItem(appDef, "/", appDef);
	}

	private buildItem(appDef, currentPath: string, currentAppElement): void {

		// Run the task
		var task: Task = this.getTaskByName(currentPath);
		if (task) this.run(task, currentPath, appDef, currentAppElement);
	
	
		// Iterate trhough object properties (app def elements)
		for (var propName in currentAppElement) {
			var propValue = currentAppElement[propName];
			if (propValue != null && typeof propValue == "object") {
				var currentPropPath = path.join(currentPath, propName).replace("\\", "/");
				console.log(currentPropPath);
				if (Array.isArray(propValue)) {
					for (var index = 0; index < propValue.length; index++) {
						var arrayItem = propValue[index];
						this.buildItem(appDef, currentPropPath, arrayItem);
					}
				}
				else {
					// TODO: avoid date instanceof Date
					this.buildItem(appDef, currentPropPath, propValue);
				}
			}
		}
	}
}

export var instance: Builder = new Builder();
