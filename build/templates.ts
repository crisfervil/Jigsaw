/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import path = require("path");
import {fs} from "../util/fs";
import util = require("util");
import ejs = require("ejs");


export class Template {
	id: string;
	path:string;
	module:string;
}

export class TemplateExecutionContext {
	appDef;
	modelDef;
	currentItem;
	currentItemPath:string;
	workingDir:string;
}

export class TemplateManager{
	
	private _templates: Array<Template> = [];

	public templates(){
		return this._templates;
	}

	public addTemplate(template:Template){
		this._templates.push(template);
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
			.catch(reject);
		});
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
	
	public getTemplates(modules:Array<string>, workingDir:string){
		var promises = new Array<Promise<Template[]>>();
		// TODO: Make it recursive
		for (var i = 0; i < modules.length; i++) {
			var moduleName = modules[i];
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

	public runTemplate(id:string, context:TemplateExecutionContext){
		var template = this.getTemplate(id);
		return this._runTemplate(template, context);
	}
	
	private _runTemplate(template:Template, context:TemplateExecutionContext){
		return new Promise((resolve, reject)=>{
			this.getTemplateContent(template, context.workingDir)
			.then(content=>{
				
				var resultOutputPath = null;
				var templateParams:any = context;
				templateParams.output = (x)=>resultOutputPath=x;
				
				// render the template using ejs
				// TODO: Allow other template engines
				var result = ejs.render(content,templateParams);
				if(resultOutputPath){
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
				}
				else{
					var error = util.format("No output path found for template: %s", template.id);
					reject(error);	
				}
			})
			.catch(reject);
		});
	}	
}