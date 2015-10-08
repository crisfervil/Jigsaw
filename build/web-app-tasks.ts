/// <reference path="../typings/tsd.d.ts" />
import {TaskManager, TaskExecutionContext} from "./tasks";
import {TemplateManager} from "./templates";

import util = require("util");

export = function(taskManager: TaskManager, templateManager:TemplateManager): void {

  taskManager.add("/", function(context: TaskExecutionContext) {
    
    console.log("building %s...", context.appDef.name);
    // do stuff for building the app
    
  });

  taskManager.add("/entities", function(context: TaskExecutionContext) {
    var entity = context.currentItem;
    console.log("building entity %s...", entity.name);
    // do stuff for building the entity
    
    //if(entity.id=="account") throw "Unexpected Error";

    // call the template for generate the route
    return templateManager.runTemplate("entities-route", context)
      .then(() => taskManager.run("/entities-db", context));

  });

  taskManager.add("/entities", function(context: TaskExecutionContext) {
    
    var entity = context.currentItem;
    console.log("building db level for entity %s...", entity.name);
    
    // depending on the entity connection, call others specific tasks
    if (entity.connection && entity.connection.type) {
      var taskName = util.format("/entities-db-%s", entity.connection.type);
      return taskManager.run(taskName, context);
    }
    else {
      // TODO: call the task for the default connection type
    }
  });

  taskManager.add("/entities/connection", function(context: TaskExecutionContext) {
    // do whatever
  });


  taskManager.add("/entities-db-sqlserver", function(context: TaskExecutionContext) {
    console.log("building SQL Server stuff for entity %s...", context.currentItem.name);
    // do stuff for building the entity
  });
};
