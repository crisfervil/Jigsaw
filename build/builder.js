/// <reference path="../typings/tsd.d.ts" />
var path = require("path");
var fs = require("fs");
var Task = (function () {
    function Task() {
    }
    return Task;
})();
exports.Task = Task;
var Template = (function () {
    function Template() {
    }
    return Template;
})();
exports.Template = Template;
var Builder = (function () {
    function Builder() {
        this._tasks = [];
        this._templates = [];
    }
    Builder.prototype.task = function (eventName, action) {
        // TODO: Check if the task already exist
        this._tasks.push({ name: eventName, action: action });
    };
    Builder.prototype.getTaskByName = function (name) {
        var task = null;
        for (var index = 0; index < this._tasks.length; index++) {
            var current = this._tasks[index];
            if (current.name == name) {
                task = current;
                break;
            }
        }
        return task;
    };
    Builder.prototype.runTask = function (taskName, rootPath, appDef, appElement) {
        var task = this.getTaskByName(taskName);
        this.run(task, rootPath, appDef, appElement);
    };
    Builder.prototype.runTaskIfExists = function (taskName, rootPath, appDef, appElement) {
        var task = this.getTaskByName(taskName);
        if (task != null)
            this.run(task, rootPath, appDef, appElement);
    };
    Builder.prototype.run = function (task, rootPath, appDef, appElement) {
        console.log("Running task [%s]...", task.name);
        task.action(rootPath, appDef, appElement);
        console.log("done");
    };
    Builder.prototype.getRoot = function (m) {
        var root = m;
        while (root.parent)
            root = root.parent;
        return root;
    };
    Builder.prototype.tryGetModule = function (moduleId, m) {
        var result = null;
        if (!m)
            m = module;
        try {
            result = m.require(moduleId);
        }
        catch (e) { }
        return result;
    };
    Builder.prototype.extend = function (object1, object2) {
        if (!object1 || (object2 && typeof object2 != "object")) {
            // merge non object values
            object1 = object2;
        }
        else {
            // merge objects
            for (var propName in object2) {
                var obj1PropValue = object1[propName];
                var obj2PropValue = object2[propName];
                if (obj2PropValue) {
                    if (!obj1PropValue) {
                        // the property doesn't exist in obj1
                        object1[propName] = obj2PropValue;
                    }
                    else {
                        if (typeof obj2PropValue == "object") {
                            if (typeof obj1PropValue != "object") {
                                //Trying to merge different types of objects
                                object1[propName] = obj2PropValue;
                            }
                            else {
                                if (Array.isArray(obj2PropValue)) {
                                    if (!Array.isArray(obj1PropValue)) {
                                        //Trying to merge different types of objects
                                        object1[propName] = obj2PropValue;
                                    }
                                    else {
                                        for (var i = 0; i < obj2PropValue.length; i++) {
                                            obj1PropValue.push(obj2PropValue[i]);
                                        }
                                    }
                                }
                                else {
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
    };
    Builder.prototype.saveJSON = function (obj, path) {
        var objStr = JSON.stringify(obj, null, 4);
        fs.writeFile(path, objStr);
    };
    Builder.prototype.buildAppDef = function (installedModules, rootModule) {
        var appDef = {};
        for (var i = 0; i < installedModules.length; i++) {
            var installedModule = installedModules[i];
            var appDefModuleId = path.join(installedModule, "app").replace("\\", "/");
            var moduleAppDef = this.tryGetModule(appDefModuleId, rootModule);
            if (moduleAppDef) {
                appDef = this.extend(appDef, moduleAppDef);
            }
        }
        return appDef;
    };
    Builder.prototype.loadBuildTasks = function (installedModules, rootModule, builder) {
        for (var i = 0; i < installedModules.length; i++) {
            var installedModule = installedModules[i];
            var buildTaskModuleId = path.join(installedModule, "build/buildTasks").replace("\\", "/");
            var buildTaskModule = this.tryGetModule(buildTaskModuleId, rootModule);
            if (buildTaskModule) {
                buildTaskModule(builder);
            }
        }
    };
    Builder.prototype.getTemplates = function (installedModules, rootModule) {
        return new Promise(function (resolve, reject) {
            // TODO: Make it recursive
            var templates = new Array();
            for (var i = 0; i < installedModules.length; i++) {
                var installedModule = installedModules[i];
                var rootModuleDir = path.dirname(rootModule.filename);
                var templatesModuleDir = path.join(rootModuleDir, "node_modules", installedModule, "templates");
                (function (dirPath) {
                    fs.exists(dirPath, function (exists) {
                        if (exists) {
                            fs.readdir(dirPath, function (err, files) {
                                if (!err) {
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
                    });
                })(templatesModuleDir);
            }
        });
    };
    Builder.prototype.runTemplateIfExists = function (templateId, appDef, item, destPath) {
        // http://ejs.co/
    };
    Builder.prototype.build = function () {
        var _this = this;
        var rootModule = this.getRoot(module);
        var rootPath = path.dirname(rootModule.filename);
        var appPkg = rootModule.require("./package");
        var installedModules = appPkg.config.platypus.packages;
        var appDef = this.buildAppDef(installedModules, rootModule);
        // merge with main app def
        var mainAppDef = this.tryGetModule("./app.json", rootModule);
        if (mainAppDef)
            appDef = this.extend(appDef, mainAppDef);
        this.saveJSON(appDef, path.join(rootPath, "/data/app.json"));
        this.loadBuildTasks(installedModules, rootModule, exports.instance);
        // load templates
        this.getTemplates(installedModules, rootModule).then(function (templates) { return _this._templates = _this._templates.concat(templates); });
        // execute tasks for each app def item
        this.buildItem(appDef, "/", appDef);
    };
    Builder.prototype.buildItem = function (appDef, currentPath, currentAppElement) {
        // Run the task
        var task = this.getTaskByName(currentPath);
        if (task)
            this.run(task, currentPath, appDef, currentAppElement);
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
    };
    return Builder;
})();
exports.Builder = Builder;
exports.instance = new Builder();
