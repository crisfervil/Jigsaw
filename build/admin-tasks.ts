/// <reference path="../typings/tsd.d.ts" />
import {TaskManager,ExecutionContext} from "./tasks";

export = function(taskManager:TaskManager):void{
  
  taskManager.add("before-build", function(context:ExecutionContext){
    
  });
  
  taskManager.add("/", function(context:ExecutionContext)
  {   
    console.log("building admin site %s...", context.appDef.name);
    // do stuff for building the admin site
    
    // get the model def
    
    // create a new app def from the model def
    
    // save it somwhere in a special dir
    
    // call the builder again in that special dir
    
  });
};
