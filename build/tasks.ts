/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import path = require("path");
import {fs} from "../util/fs";
import ejs = require("ejs");


export class Task {
	id: string;
	module: string;
	action: (context:ExecutionContext) => any;
}

export class Template {
	id: string;
	path:string;
	module:string;
}

export class ExecutionContext {
	appDef;
	modelDef;
	currentItem;
	currentItemPath:string;
	workingDir:string;
}

export class TaskManager{
	private _tasks: Array<Task> = [];
	private _templates: Array<Template> = [];
	
	public add(id, action:(context:ExecutionContext)=>any) {
		// TODO: Check if the task id already exist for the same module
		var newTask = new Task();
		newTask.id=id;
		newTask.action=action;
		this._tasks.push(newTask);
	}
	
	public tasks(){
		return this._tasks;
	}
	
	public templates(){
		return this._templates;
	}
	
	public addTemplate(template:Template){
		this._templates.push(template);
	}
	
	public get(id: string): Array<Task> {
		var task: Array<Task> = [];

		for (var index = 0; index < this._tasks.length; index++) {
			var current = this._tasks[index];
			if (current.id == id) {
				task.push(current);
			}
		}
		return task;
	}
	
	public run(id: string, context:ExecutionContext) {
		var tasks = this.get(id);
		return this.runAll(tasks,context);
	}
	
	private _run(task: Task, context:ExecutionContext) {
		return new Promise((resolve, reject)=>{
			console.log("Running task %s...", task.id);
			try {
				var retVal = task.action.call(this, context);
				if(retVal&&retVal instanceof Promise){
					// If the task has returned a Promise, means that is an asyn task
					// So, wait until is resolved
					var rv:Promise<any> = retVal;
					rv
					.then(x=>resolve(rv))
					.catch(err=>{
						// Error executing the task
						console.log("Error executing task %s: %s", task.id, err);
						reject(err);});
				}
				else{
					// If the task returns nothins or any other value
					// means that is a sync task, so we can resolve it inmediately
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
	
	public runAll(tasks: Task[], context:ExecutionContext) {
		var promises : Array<Promise<any>> = [];
		for (var i = 0; i < tasks.length; i++) {
			var task = tasks[i];
			var p = this._run(task, context);
			promises.push(p);
		}
		return Promise.all(promises);
	}
	
	public getTemplate(id:string):Template{
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
			fs.readFile(templatePath).then(data=>{
				resolve(data.toString());
			})
			.catch(error=>{reject(error);});
		});
	}

	public runTemplate(id:string, context:ExecutionContext){
		var template = this.getTemplate(id);
		return this._runTemplate(template, context);
	}
	
	public _runTemplate(template:Template, context:ExecutionContext){
		return new Promise((resolve, reject)=>{
			this.getTemplateContent(template, context.workingDir)
			.then(content=>{
				
				var resultOutputPath = null;
				var templateParams:any = context;
				templateParams.output = (x)=>resultOutputPath=x;
				
				// render the template using ejs
				// TODO: Allow other template engines
				var result = ejs.render(content,templateParams);
				
				if(!path.isAbsolute(resultOutputPath)){
					// TODO: Change the working dir for the output dir
					resultOutputPath = path.join(context.workingDir, resultOutputPath);
				} 
				fs.mkdirP(path.dirname(resultOutputPath), error=>{
					if(!error)
						fs.writeFile(result,resultOutputPath)
						.then(resolve)
						.catch(error=>reject(error));
					else
						reject(error);
				});
			})
			.catch(error=>reject(error));
		});
	}	
	
}