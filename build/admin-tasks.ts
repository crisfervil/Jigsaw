/// <reference path="../typings/tsd.d.ts" />
import {TaskManager, TaskExecutionContext} from "./tasks";
import {TemplateManager} from "./templates";
import {fs} from "../util/fs"
import path = require("path");

export =
function (taskManager:TaskManager, templateManager:TemplateManager):void {

    function getValueFromJsonReference(obj, jsonReference) {
        // TODO: To be Implemented
        if (jsonReference == "#/definitions/entity")
            return obj.definitions.entity;
        if (jsonReference == "#/definitions/entityField")
            return obj.definitions.entityField;

    }

    function getEntitiesFromModelObject(model, obj, propName:string) {
        //TODO: To be implemented
        var entities:Array<any> = [];

        var entity:any = {};
        var entityId = "meta_" + (obj.id || propName);
        entity.id = entityId;
        entity.name = obj.name || entityId;
        if (obj.description) entity.description = obj.description;
        entity.pluralName = obj.pluralName || entityId;
        entity.connection = {type: "metadata"}
        entity.fields = [];
        entities.push(entity);

        // iterate through entity properties
        for (var propertyName in obj.properties) {
            var propertyInfo = obj.properties[propertyName];
            if (propertyInfo.type == "array") {
                // create entity for the array elements
                if (propertyInfo.items.$ref) { // is an object reference
                    var referencedObj = getValueFromJsonReference(model, propertyInfo.items.$ref);
                    var objectId = path.basename(propertyInfo.items.$ref);
                    var subEntities = getEntitiesFromModelObject(model, referencedObj, objectId);
                    entities = entities.concat(subEntities);

                    // TODO: add a relationship between two entities
                }
            }
            else if (propertyInfo.type != "object") {
                var entityField:any = {};
                var fieldId = propertyInfo.id || propertyName;
                entityField.id = fieldId;
                entityField.name = propertyInfo.name || fieldId;
                entityField.type = propertyInfo.type;
                if (propertyInfo.description) entityField.description = propertyInfo.description;
                entity.fields.push(entityField);
            }
        }

        return entities;
    }

    taskManager.add("before-build", function (context:TaskExecutionContext) {

        // get the metadata entities from the model definition
        var entites = getEntitiesFromModelObject(context.modelDef, context.modelDef, "application")
        context.appDef.entities = context.appDef.entities.concat(entites);

    });

    taskManager.add("application", function (context:TaskExecutionContext) {

        // copy metadata db
        return fs.copyFile(path.join(process.cwd(), "/node_modules/greenmouse/db/jsonDB.js"), path.join(process.cwd(), "/app/db/jsonDB.js"));

    });

};
