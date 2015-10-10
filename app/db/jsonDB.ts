/// <reference path="../../typings/tsd.d.ts" />

import {Obj} from "../../util/obj";
import util = require("util");

export class jsonDB {
	
	private dbData:Object=null;
	
	constructor(defaultData?:any){
		this.dbData=defaultData||{};
	}
	
	private getIdIndex(arrayValue:any[],id:string){
		var returnValue=-1;
		for (var i = 0; i < arrayValue.length; i++) {
			var arrayItem = arrayValue[i];
			if(arrayItem.id==id){
				returnValue=i;
				break;
			}
		}
		return returnValue;
	}
	
	public select(objectPath:string, currentObj?):any{
		currentObj=currentObj||this.dbData;
		var pathParts = objectPath.split("/");
		var currentItemInPath=pathParts[0];
		
		var currentValue=currentObj[currentItemInPath];
		if(!currentValue&&Array.isArray(currentObj)){
			var ndx=this.getIdIndex(currentObj,currentItemInPath);
			if(ndx>-1) currentValue=currentObj[ndx];
		}
		
		if(currentValue){
			currentObj=currentValue;
			if(pathParts.length>1){
				var remainingPath = pathParts.slice(1).join("/");
				currentObj=this.select(remainingPath,currentObj);
			}
		}
		else {
			currentObj = currentValue;
		}
		return currentObj;
	}
	
	public insert(objectPath:string,data,currentObj?){
		currentObj=currentObj||this.dbData;
		var pathParts = objectPath.split("/");
		var currentItemInPath=pathParts[0];
		
		var currentValue=currentObj[currentItemInPath];
		
		if(!currentValue&&Array.isArray(currentObj)){
			var ndx=this.getIdIndex(currentObj,currentItemInPath);
			if(ndx>-1){
				currentValue = currentObj[ndx];
				currentItemInPath=ndx+"";
			}
		}
		if(!currentValue||!(currentValue instanceof Object)){
			currentObj[currentItemInPath]={};
			currentValue=currentObj[currentItemInPath];
		}

		if(pathParts.length>1){
			var remainingPath = pathParts.slice(1).join("/");
			
			if(remainingPath==""&&Array.isArray(currentValue)){
				currentValue.push(data);
			}
			else{
				this.insert(remainingPath,data,currentValue);
			}
			
		}
		else {
			currentObj[currentItemInPath]=data;
		}		
		
	}
	public update(objectPath:string, data){
		var existing = this.select(objectPath);
		if(!existing) {
			throw new Error(util.format("Object not found in %s",objectPath));
		}
		existing = Obj.extend(existing,data);
		this.insert(objectPath,data);
	}
	public delete(objectPath:string){
		var existing = this.select(objectPath);
		if(!existing) {
			throw new Error(util.format("Object not found in %s",objectPath));
		}
		// TBC
	}
}