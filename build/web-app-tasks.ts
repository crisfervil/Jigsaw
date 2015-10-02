/// <reference path="../typings/tsd.d.ts" />
import {Builder} from "./builder";

import util = require("util");

export = function(builder:Builder):void{

  builder.task("/",function(appDef)
  {   
    console.log("building %s...", appDef.name);
    // do stuff for building the app
  });

  builder.task("/entities",function(appDef, entity)
  { 
    console.log("building entity %s...", entity.name);
    // do stuff for building the entity
    
     //if(entity.id=="account") throw "Unexpected Error";

    // call the template for generate the route
    return builder.runTemplate("entities-route", appDef, entity)
    .then(()=>builder.runTask("/entities-db", appDef, entity));

  });

  builder.task("/entities-db",function(appDef, entity)
  { 
      console.log("building db level for entity %s...", entity.name);
  
    // depending on the entity connection, call others specific tasks
    if(entity.connection&&entity.connection.type){
      var taskName = util.format("/entities-db-%s",entity.connection.type);
      return builder.runTask(taskName, appDef, entity);
    }
    else
    {
      // TODO: call the task for the default connection type
    }
  });
  
  builder.task("/entities/connection",function(appDef, connection){
      // do whatever
  });


  builder.task("/entities-db-sqlserver",function(appDef, entity)
  { 
    console.log("building SQL Server stuff for entity %s...", entity.name);
    // do stuff for building the entity
  });
};
