/// <reference path="../typings/main.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import {TaskExecutionContext} from "./tasks";
import {JsonPath} from "./jsonPath";

import path = require("path");
import {fs} from "../util/fs";
import util = require("util");
import ejs = require("ejs");
import os = require("os");


export class Template {
    id:string;
    path:string;
    module:string;
    content:string;
    //item:{path:string,criteria:string};
    selector:string;
    outputPath:string;
}

export class TemplateExecutionContext {
    appDef;
    modelDef;
    currentItem;
    currentItemPath:string;
    workingDir:string;
}

export interface TemplateRunner {
  runTemplate(Template,TemplateExecutionContext):Promise<void>;
}

export class EJSTemplateRunner implements TemplateRunner {
  public runTemplate(template:Template, context:TemplateExecutionContext) {
      return new Promise<void>((resolve, reject)=> {

        // render the template using ejs
        console.log("running template %s for %s...", template.id, context.currentItemPath);
        var templateContext:any = context; // used just to convert to the appropriate type
        var result = ejs.render(template.content, templateContext);

        var resultOutputPath= ejs.render(template.outputPath, templateContext);

        if (resultOutputPath) {
            if (!path.isAbsolute(resultOutputPath)) {
                // TODO: Change the working dir for the output dir
                resultOutputPath = path.join(context.workingDir, resultOutputPath);
            }
            fs.mkdirP(path.dirname(resultOutputPath), error=> {
                if (!error){
                    fs.writeFile(result, resultOutputPath)
                        .then(()=>resolve())
                        .catch(reject);
                }
                else{
                  reject(error);
                }
            });
        }
        else {
            var error = util.format("No output path found for template: %s", template.id);
            reject(error);
        }
      });
  }
}

export class TemplateManager {

    private _selector_output = /(?:\/{2,}|<!--)\s*(selector|outputPath)\s*\:\s*(.*(?=-->)|.*)/;

    private _templates = new Array<Template>();
    private _templateRunner:TemplateRunner;

    constructor(templateRuner?:TemplateRunner){
      if(templateRuner!==undefined){
        this._templateRunner=templateRuner;
      }
    }

    public templates() {
        return this._templates;
    }

    public add(template:Template) {
        this._templates.push(template);
    }

    public addRange(templates:Template[]) {
        templates.forEach(x=>this._templates.push(x));
    }

    public getById(id:string):Template {
        var template:Template = null;
        for (var i = 0; i < this._templates.length; i++) {
            var currentTemplate = this._templates[i];
            if (currentTemplate.id == id) {
                template = currentTemplate;
                break;
            }
        }
        return template;
    }

    private getTemplateContent(template:Template, workingDir:string):Promise<string> {
        var templatePath = path.join(workingDir, "node_modules", template.module, template.path);
        return fs.readFile(templatePath).then<string>(data=>data.toString());
    }

    //* Sets the template content and tries to read the item and output from it */
    private setContent(template:Template,content:string){
      template.content=content;
      var removeCount=0;
      var templateLines = content.split(os.EOL);
      for(var i=0;i<templateLines.length&&i<2;i++){
        var m = this._selector_output.exec(templateLines[i]);
        if(m&&m[1]&&m[2]){
          removeCount+=templateLines[i].length+os.EOL.length;
          var type=m[1],value=m[2];
          if(type=="selector") template.selector = value;
          if(type=="outputPath") template.outputPath = value;
          //templateLines.shift(); // removes this line from content
        }
      }
      if(removeCount>0)
        template.content=template.content.substring(removeCount);
    }

    private loadTemplatesContent(templates:Array<Template>, workingDir:string):Promise<Template[]> {
        var promises = new Array<Promise<void>>();

        for (var i = 0; i < templates.length; i++) {
            var template = templates[i];

            ((t)=>{
              var promise =
                this.getTemplateContent(t, workingDir)
                    .then(content=>this.setContent(t,content));
            promises.push(promise);
          })(template);
        }

        return Promise.all(promises).then<Template[]>(x=>templates);
    }

    private getTemplateObjects(files:Array<string>, moduleName:string, workingDir:string):Array<Template> {
        var templates = new Array<Template>();
        var dirPath = path.join(workingDir, "node_modules", moduleName, "templates");
        for (var i = 0; i < files.length; i++) {
            var templateFile = files[i];
            var template = new Template();

            var templateExt = path.extname(templateFile);
            if (templateExt) {
                template.id = path.basename(templateFile, templateExt);
            }
            else {
                template.id = templateFile;
            }

            // Make the path relative
            template.path = path.relative(path.join(workingDir, "node_modules", moduleName),
                path.join(dirPath, templateFile));
            template.module = moduleName;
            templates.push(template);
        }
        return templates;
    }

    private getTemplatesFromModule(moduleName:string, workingDir:string):Promise<Template[]> {
        return new Promise<Template[]>((resolve, reject)=> {
            var dirPath = path.join(workingDir, "node_modules", moduleName, "templates");
            fs.exists(dirPath).then(exists=> {
                if (exists) {
                    fs.readdir(dirPath).then(files=> {
                        var templates = this.getTemplateObjects(files, moduleName, workingDir);

                        this.loadTemplatesContent(templates, workingDir)
                            .then(resolve)
                            .catch(reject);
                    });
                }
                else {
                    resolve([]);
                }
            })
                .catch(reject)
        });
    }

    public getTemplates(modules:Array<string>, workingDir:string):Promise<Template[]> {
        var promises = new Array<Promise<Template[]>>();
        var returnTemplates = new Array<Template>();

        modules.forEach(m=>promises.push(this.getTemplatesFromModule(m, workingDir)));

        return Promise.all(promises)
            // Add the returned templates[][] to the templates array
            .then(allTemplates=>allTemplates.forEach(someTemplates=>someTemplates.forEach(template=>returnTemplates.push(template))))
            .then<Template[]>(x=>returnTemplates);
    }

    public getTemplatesForContext(itemPath:string,rootObject,item):Template[]{
      var foundTemplates=new Array<Template>();

      for(var i=0;i<this._templates.length;i++){
        var currentTemplate = this._templates[i];

        if(itemPath==currentTemplate.selector){
          foundTemplates.push(currentTemplate);
        }
        else if(JsonPath.areEquals(currentTemplate.selector,itemPath)) {
            var found = JsonPath.find(rootObject,currentTemplate.selector);
            if(found==item){
              foundTemplates.push(currentTemplate);
            }
        }
      }

      // If there are not values, return null instead of an empty array
      return foundTemplates.length>0?foundTemplates:null;
    }

    public runTemplateOnContext(context:TaskExecutionContext):Promise<void>{
      var returnValue = Promise.resolve<void>();
      var promises = new Array<Promise<void>>();
      var foundTemplates = this.getTemplatesForContext(context.currentItemPath,context.appDef,context.currentItem);
      if(foundTemplates){
        for(var i=0;i<foundTemplates.length;i++){
          var currentTemplate = foundTemplates[i];
          var curPromise = this._templateRunner.runTemplate(currentTemplate,context);
          promises.push(curPromise);
        }
        returnValue = Promise.all(promises)
                      .then<void>(x=>null);// this just to convert returned values to null
      }
      return returnValue;
    }

    public runTemplate(id:string, context:TemplateExecutionContext) {
        var template = this.getById(id);
        if (!template) throw  new Error(util.format("Template %s not found", id));
        return this._templateRunner.runTemplate(template, context);
    }

    public runTemplateIfExist(id:string, context:TemplateExecutionContext) {
        var template = this.getById(id);
        if (template)
            return this._templateRunner.runTemplate(template, context);
    }

}
