/// <reference path="../typings/tsd.d.ts" />
import {Builder} from "./builder";
import webbAppTasks = require("./web-app-tasks");
import adminTasks = require("./admin-tasks");
export = function(builder:Builder):void{
  webbAppTasks(builder);
  adminTasks(builder);
};
