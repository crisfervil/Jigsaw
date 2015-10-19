
import {TaskManager} from "./core/tasks";
import {TemplateManager} from "./core/templates";
import webbAppTasks = require("./core/web-app-tasks");
import adminTasks = require("./core/admin-tasks");

export = function(taskManager:TaskManager, templateManager:TemplateManager):void{
  webbAppTasks(taskManager,templateManager);
  adminTasks(taskManager,templateManager);
};
