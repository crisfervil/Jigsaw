/// <reference path="../typings/tsd.d.ts" />
import {TaskManager, TaskExecutionContext} from "./tasks";
import {TemplateManager, TemplateExecutionContext} from "./templates";
import {fs} from "../util/fs";

import util = require("util");
import path = require("path");

export =
function (taskManager:TaskManager, templateManager:TemplateManager):void {


    // Run entities-route template
    taskManager.add("/entities", function (context:TaskExecutionContext) {
        return templateManager.runTemplate("entities-route", context);
    });

    // Run entities-db-* template
    taskManager.add("/entities", function (context:TaskExecutionContext) {
        var entity = context.currentItem;
        if (entity.connection && entity.connection.type) {
            // depending on the entity connection, execute a specific template
            var templateId = util.format("entities-db-%s", entity.connection.type);
            return templateManager.runTemplateIfExist(templateId, context);
        }
    });

    // Copy util files
    taskManager.add("/", function (context:TaskExecutionContext) {
        //TODO: Find a way to allow specify relative paths
        return fs.copyFile(path.join(process.cwd(), "/node_modules/greenmouse/util/fs.js"), path.join(process.cwd(), "/app/util/fs.js"))
                .then(()=>fs.copyFile(path.join(process.cwd(), "/node_modules/greenmouse/util/obj.js"), path.join(process.cwd(), "/app/util/obj.js")));
    });


};
