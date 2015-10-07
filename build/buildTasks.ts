/// <reference path="../typings/tsd.d.ts" />

import {TaskManager} from "./tasks";
import webbAppTasks = require("./web-app-tasks");
import adminTasks = require("./admin-tasks");

export = function(taskManager:TaskManager):void{
  webbAppTasks(taskManager);
  adminTasks(taskManager);
};
