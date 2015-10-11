/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import path = require("path");
import {fs} from "../util/fs";
import util = require("util");
import ejs = require("ejs");


export class Template {
    id:string;
    path:string;
    module:string;
    content:string;
}

export class TemplateExecutionContext {
    appDef;
    modelDef;
    currentItem;
    currentItemPath:string;
    workingDir:string;
}

export class TemplateManager {

    private _templates = new Array<Template>();

    public templates() {
        return this._templates;
    }

    public addTemplate(template:Template) {
        this._templates.push(template);
    }

    public addTemplates(templates:Template[]) {
        templates.forEach(x=>this._templates.push(x));
    }

    public getTemplate(id:string):Template {
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

    private loadTemplatesContent(templates:Array<Template>, workingDir:string):Promise<Template[]> {
        var promises = new Array<Promise<string>>();

        for (var i = 0; i < templates.length; i++) {
            var template = templates[i];
            var promise =
                this.getTemplateContent(template, workingDir)
                    .then(content=>template.content = content);
            promises.push(promise);
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

    public runTemplate(id:string, context:TemplateExecutionContext) {
        var template = this.getTemplate(id);
        if (!template) throw  new Error(util.format("Template %s not found", id));
        return this._runTemplate(template, context);
    }

    public runTemplateIfExist(id:string, context:TemplateExecutionContext) {
        var template = this.getTemplate(id);
        if (template)
            return this._runTemplate(template, context);
    }

    private _runTemplate(template:Template, context:TemplateExecutionContext) {
        return new Promise((resolve, reject)=> {
            this.getTemplateContent(template, context.workingDir)
                .then(content=> {

                    var resultOutputPath = null;
                    var templateParams:any = context;
                    templateParams.output = (x)=>resultOutputPath = x;

                    // render the template using ejs
                    // TODO: Allow other template engines
                    console.log("running template %s...", template.id);
                    var result = ejs.render(content, templateParams);
                    if (resultOutputPath) {
                        if (!path.isAbsolute(resultOutputPath)) {
                            // TODO: Change the working dir for the output dir
                            resultOutputPath = path.join(context.workingDir, resultOutputPath);
                        }
                        fs.mkdirP(path.dirname(resultOutputPath), error=> {
                            if (!error)
                                fs.writeFile(result, resultOutputPath)
                                    .then(resolve)
                                    .catch(error=>reject(error));
                            else
                                reject(error);
                        });
                    }
                    else {
                        var error = util.format("No output path found for template: %s", template.id);
                        reject(error);
                    }
                })
                .catch(reject);
        });
    }
}