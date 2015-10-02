/// <reference path="../typings/tsd.d.ts" />
import {Builder} from "./builder";

export = function(builder:Builder):void{
  builder.task("/",function(appDef)
  {   
    console.log("building admin site %s...", appDef.name);
    // do stuff for building the admin site
    
    // get the model def
    
    // create a new app def from the model def
    
    // save it somwhere in a special dir
    
    // call the builder again in that special dir
    
  });
};
