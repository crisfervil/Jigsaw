/// <reference path="../typings/tsd.d.ts"/>

import {Obj} from "../util/obj";
import {fs} from "../util/fs";
import util = require("util");


enum Status {Loading,Ready};

export class jsonDB {

    private dbData:Object;
    private _dbPath:string;

    private _state:Status = Status.Ready;

    constructor(defaultData?:any) {
        this.dbData = defaultData || {};
    }

    private getIdIndex(arrayValue:any[], id:string) {
        var returnValue = -1;
        for (var i = 0; i < arrayValue.length; i++) {
            var arrayItem = arrayValue[i];
            if (arrayItem.id == id) {
                returnValue = i;
                break;
            }
        }
        return returnValue;
    }

    public state(){
        return this._state;
    }

    /** indicates that the db was loaded successfully from path */
    public dbPath(){
        return this._dbPath;
    }

    public load(path:string){
        this._state = Status.Loading;
        return fs.loadJSON(path)
            .then(obj=>{
                this._state = Status.Ready;
                this.dbData=obj;
                this._dbPath=path;
            });
    }

    public save(path:string){
        return fs.saveJSON(this.dbData,path);
    }

    public select(objectPath:string, currentObj?):any {

        if(this._state!=Status.Ready) throw new Error("invalid db state");

        currentObj = currentObj || this.dbData;
        var pathParts = objectPath.split("/");
        var currentItemInPath = pathParts[0];

        var currentValue = currentObj[currentItemInPath];
        if (!currentValue && Array.isArray(currentObj)) {
            var ndx = this.getIdIndex(currentObj, currentItemInPath);
            if (ndx > -1) currentValue = currentObj[ndx];
        }

        if (currentValue) {
            currentObj = currentValue;
            if (pathParts.length > 1) {
                var remainingPath = pathParts.slice(1).join("/");
                currentObj = this.select(remainingPath, currentObj);
            }
        }
        else {
            currentObj = currentValue;
        }
        return currentObj;
    }

    public insert(objectPath:string, data, currentObj?) {

      if(this._state!=Status.Ready) throw new Error("invalid db state");

        currentObj = currentObj || this.dbData;
        var pathParts = objectPath.split("/");
        var currentItemInPath = pathParts[0];

        var currentValue = currentObj[currentItemInPath];

        if (!currentValue && Array.isArray(currentObj)) {
            var ndx = this.getIdIndex(currentObj, currentItemInPath);
            if (ndx > -1) {
                currentValue = currentObj[ndx];
                currentItemInPath = ndx + "";
            }
        }
        if (!currentValue || !(currentValue instanceof Object)) {
            currentObj[currentItemInPath] = {};
            currentValue = currentObj[currentItemInPath];
        }

        if (pathParts.length > 1) {
            var remainingPath = pathParts.slice(1).join("/");

            if (remainingPath == "" && Array.isArray(currentValue)) {
                currentValue.push(data);
            }
            else {
                this.insert(remainingPath, data, currentValue);
            }

        }
        else {
            currentObj[currentItemInPath] = data;
        }

    }

    public update(objectPath:string, data) {

      if(this._state!=Status.Ready) throw new Error("invalid db state");

        var existing = this.select(objectPath);
        if (!existing) {
            throw new Error(util.format("Object not found in %s", objectPath));
        }
        existing = Obj.extend(existing, data);
        this.insert(objectPath, existing);
    }

    public delete(objectPath:string) {

      if(this._state!=Status.Ready) throw new Error("invalid db state");

        var existing = this.select(objectPath);
        if (!existing) {
            throw new Error(util.format("Object not found in %s", objectPath));
        }


        var pathParts = objectPath.split("/");
        var propName = pathParts.pop();
        var parentObject;
        if (pathParts.length > 0) {
            var parentPath = pathParts.join("/");
            parentObject = this.select(parentPath);
        }
        else {
            parentObject = this.dbData;
        }
        if (Array.isArray(parentObject)) {
            var arr:Array<any> = parentObject;
            var index = arr.indexOf(existing);
            parentObject = arr.splice(index, 1);
        }
        else {
            delete parentObject[propName];
        }
    }
}

export var instance = new jsonDB();
