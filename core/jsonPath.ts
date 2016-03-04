

export class JsonPath {


  private static RE_PATTERN:string = "(\\/)?(\\w+)(\\[(\\d+)])?(\\/)?";

  /* returns the path without conditions. Useful to compare two equivalen paths */
  public static areEqual(path1:string,path2:string){
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

      result = path1==path2;
    }
    return result;
  }

  public static find(object,query:string){
      var foundObject = null;
      if(object&&query){
        if(query=="/"){
            foundObject=object;
        }
        else {
          var re = new RegExp(JsonPath.RE_PATTERN,"g");
          var m = re.exec(query);
          if(m&&m.length>0){
            var fullQueryPart = m[0];
            if(fullQueryPart) {
              var propName = m[2];
              var propIndex = m[4]

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
