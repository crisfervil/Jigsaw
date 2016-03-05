

/**
@class
Helpers to find something inside a javascript object using a simple query notation
*/
export class JsonPath {


  private static RE_PATTERN = /(\/)?(\w+)(\[(\d+)?])?(\/)?/;

  /**
  Compares two equivalent paths.
  @method JsonPath#areEqual
  @param {string} path1 - first path to compare
  @param {string} path2 - second path to compare
  */
  public static areEquals(path1:string,path2:string){
    var result = false;
    if(path1===null||path2===null){
        result=false;
    }
    else {
      // remove initial or final slash
      if(path1[0]=="/") path1=path1.substr(1);
      if(path1[path1.length-1]=="/") path1=path1.substr(0,path1.length-1);
      if(path2[0]=="/") path2=path2.substr(1);
      if(path2[path2.length-1]=="/") path2=path2.substr(0,path2.length-1);

      path1 = JsonPath.removeConditions(path1);
      path2 = JsonPath.removeConditions(path2);

      result = path1==path2;
    }
    return result;
  }


  public static removeConditions(query:string){
    var result = null;
    if(query){
      //var re = JsonPath.RE_PATTERN.
      var m = JsonPath.RE_PATTERN.exec(query);
      if(m&&m.length>0){
        var fullQueryPart = m[0];
        if(fullQueryPart) {
          result = "";
          if (m[1]) result = "/";
          if (m[2]) result = result + m[2];
          if (m[3]) result = result + "[]";
          if (m[5]) result = result + "/";
          var remainingQueryStr = query.substr(fullQueryPart.length);
          if(remainingQueryStr){
            result = result + JsonPath.removeConditions(remainingQueryStr);
          }
        }
      }
    }
    return result;
  }

  /**
  * Finds an object using a query
  */
  public static find(object,query:string){
      var foundObject = null;
      if(object&&query){
        if(query=="/"){
            foundObject=object;
        }
        else {
          //var re = new RegExp(JsonPath.RE_PATTERN,"g");
          var m = JsonPath.RE_PATTERN.exec(query);
          if(m&&m.length>0){
            var fullQueryPart = m[0];
            if(fullQueryPart) {
              var propName = m[2];
              var propIndex = m[4];

              foundObject = object[propName];
              if(propIndex&&foundObject)
              {
                foundObject = foundObject[propIndex];
              }

              var remainingQueryStr = query.substr(fullQueryPart.length);

              if(remainingQueryStr){
                foundObject = JsonPath.find(foundObject, remainingQueryStr);
              }
            }
          }
        }
      }
      return foundObject;
  }
}
