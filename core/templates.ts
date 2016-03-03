/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import path = require("path");
import {fs} from "../util/fs";
import util = require("util");
import ejs = require("ejs");

import {TaskExecutionContext} from "./tasks";

export class Template {
    id:string;
    path:string;
    module:string;
    content:string;
    item:{path:string,criteria:string};
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
        // TODO: Allow other template engines
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

      var templateLines = content.split("\n");

      if(templateLines.length>0){
        template.item = this.getItemFromTemplate(templateLines[0]);
        if(!template.item) template.item = this.getItemFromTemplate(templateLines[1]);
        template.outputPath = this.getOutputFromTemplate(templateLines[0]);
        if(!template.outputPath) template.outputPath = this.getOutputFromTemplate(templateLines[1]);
      }
    }

    private getItemFromTemplate(templateLine:string){
      var result:{path:string,criteria:string};
      var re = /\/+\**\s*item\s*:\s*(.*)/g;
      var found = re.exec(templateLine);
      if(found){
        if(found.length>1)
          var re2 = /([^[]*)(\[([^\]]+)\])*/g
          var found2 = re2.exec(found[1]);
          if(found2){
            if(found2.length>0){
              result = {path:found2[1],criteria:null};
              if(found2.length>2){
                result.criteria = found2[3];
              }
            }
          }
      }
      return result;
    }

    private getOutputFromTemplate(templateLine:string){
      var result:string;
      var re = /\/+\**\s*output\s*:\s*(.*)/g;
      var found = re.exec(templateLine);
      if(found){
        if(found.length>1)
          result = found[1];
      }
      return result;
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

    private matchesTemplateCriteria(criteria:string, context:TaskExecutionContext):boolean{
      var returnValue = false;
      try{
        // TODO: Improve this. Is awful
        returnValue = eval(criteria);
      }catch(err){
        console.log("warnig: error evaluating template criteria: %s", criteria);
        console.log(err);
      }


      return returnValue;
    }

    public runTemplateOnContext(context:TaskExecutionContext):Promise<any>{
      var returnValue = Promise.resolve<void>();
      var promises = new Array<Promise<void>>();
      for(var i=0;i<this._templates.length;i++){
        var currentTemplate = this._templates[i];
        //console.log("t:"+currentTemplate.item.path);
        //console.log("i:"+context.currentItemPath);
        if(currentTemplate.item && currentTemplate.item.path==context.currentItemPath){
          var matches = false;
          if(currentTemplate.item.criteria){
              matches = this.matchesTemplateCriteria(currentTemplate.item.criteria, context);
          }
          if(!currentTemplate.item.criteria||matches){
            var curPromise = this._templateRunner.runTemplate(currentTemplate,context);
            promises.push(curPromise);
          }
        }
      }
      returnValue = Promise.all(promises)
                    .then<void>(x=>{});// this just to convert returned values to void
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
