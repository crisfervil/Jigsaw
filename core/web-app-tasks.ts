/// <reference path="../typings/tsd.d.ts" />
import {TaskManager, TaskExecutionContext} from "./tasks";
import {TemplateManager, TemplateExecutionContext} from "./templates";
import {fs} from "../util/fs";

import util = require("util");
import path = require("path");

export =
function (taskManager:TaskManager, templateManager:TemplateManager):void {

    // Copy util files
    taskManager.add("app", function (context:TaskExecutionContext) {
        //TODO: Find a way to allow specify relative paths
        return fs.copyFile(path.join(process.cwd(), "/node_modules/greenmouse/util/fs.js"), path.join(process.cwd(), "/app/util/fs.js"))
                .then(()=>fs.copyFile(path.join(process.cwd(), "/node_modules/greenmouse/util/obj.js"), path.join(process.cwd(), "/app/util/obj.js")));
    });

};
