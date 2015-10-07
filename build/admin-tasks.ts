/// <reference path="../typings/tsd.d.ts" />
import {TaskManager,ExecutionContext} from "./tasks";

export = function(taskManager:TaskManager):void{
  
  function getValueFromJsonReference(obj,jsonReference){
    // TODO: To be Implemented
    return obj.definitions.entity;
  }
  
  function createEntity(obj, propName:string){
    //TODO: To be implemented
    var entity:any={};
    
    entity.id = "meta_" + (obj.id||propName);
    entity.name = obj.name;
    entity.pluralName = obj.pluralName;
    entity.connection = {type:"metadata"}
    
    return entity;
  }
  
  taskManager.add("before-build", function(context:ExecutionContext){

      // create entity application
      var applicationEntity:any = {id:"meta_application",name:"Application",pluralName:"Applications"};
      applicationEntity.connection = {type:"metadata"}
      context.appDef.entities.push(applicationEntity);


      // iterate through application properties
      for (var propertyName in context.modelDef.properties) {
          var propertyInfo = context.modelDef.properties[propertyName];
          if(propertyInfo.type=="array"){
              // create entity for the array elements
              if(propertyInfo.items.$ref){
                  var referencedObj = getValueFromJsonReference(context.modelDef,propertyInfo.items.$ref); 
                  var entity = createEntity(referencedObj, propertyName);
                  context.appDef.entities.push(entity);
              }
          }
      }
  });
};
