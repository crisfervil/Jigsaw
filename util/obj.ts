export class Obj{

	public static clone(obj) {
		if (null == obj || "object" != typeof obj) return obj;
		var copy = obj.constructor();
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
		}
		return copy;
	}

	
	/**
	 * Merges two objects. Copies all the properties of object2 in object1
	 */
	public static extend(object1, object2){

		if (!object1 || (object2 && typeof object2 != "object")){
			// merge non object values
			object1=object2;
		}
		else
		{
			// merge objects
			for(var propName in object2){
				var obj1PropValue = object1[propName];
				var obj2PropValue = object2[propName];
				if(obj2PropValue) {
					if(!obj1PropValue)
					{
						// the property doesn't exist in obj1
						object1[propName] = obj2PropValue;
					}
					else {
						if (typeof obj2PropValue == "object"){
							if(typeof obj1PropValue != "object"){
								//Trying to merge different types of objects
								object1[propName] = obj2PropValue
							}
							else{
								if(Array.isArray(obj2PropValue))
								{
									if(!Array.isArray(obj1PropValue))
									{
										//Trying to merge different types of objects
										object1[propName] = obj2PropValue
									}
									else {
										for (var i = 0; i < obj2PropValue.length; i++) {
											obj1PropValue.push(obj2PropValue[i]);
										}
									}
								}
								else{
									// merge two non array obects
									object1[propName] = this.extend(obj1PropValue, obj2PropValue);
								}							
							}
						}
						else {
							object1[propName] = obj2PropValue;
						}
					}
				}
			}
		}
		
		return object1;
	}
}