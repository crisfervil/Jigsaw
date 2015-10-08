/// <reference path="../typings/tsd.d.ts" />

import {TaskManager} from "./tasks";
import {TemplateManager} from "./templates";
import webbAppTasks = require("./web-app-tasks");
import adminTasks = require("./admin-tasks");

export = function(taskManager:TaskManager, templateManager:TemplateManager):void{
  webbAppTasks(taskManager,templateManager);
  adminTasks(taskManager,templateManager);
};
