/// <reference path="../typings/tsd.d.ts" />
import {Builder} from "builder";

var util = require("util");
var path = require("path");

export = function(builder:Builder):void{

  builder.task("/",function(rootPath, appDef)
  { 
    console.log("building %s...", appDef.name);
    // do stuff for building the app
  });

  builder.task("/entities",function(rootPath, appDef, entity)
  { 
    console.log("building entity %s...", entity.name);
    // do stuff for building the entity
    
    // call the template for generate the route
    console.log(rootPath);
    builder.runTemplateIfExists("entities-route.js", appDef, entity);
    
    // run the db tasks
    builder.runTaskIfExists("/entities-db", rootPath, appDef, entity);
    
  });
  
  builder.task("/entities-db",function(rootPath, appDef, entity)
  { 
    console.log("building db level for entity %s...", entity.name);
    // do stuff for building the entity
  
    // depending on the entity connection, call others
    if(entity.connection&&entity.connection.type){
      builder.runTaskIfExists(util.format("/entities-db-%s",entity.connection.type), rootPath, appDef, entity);
    }
  });
  
  builder.task("/entities-db-sqlserver",function(rootPath, appDef, entity)
  { 
    console.log("building SQL Server stuff for entity %s...", entity.name);
    // do stuff for building the entity
  });
};
