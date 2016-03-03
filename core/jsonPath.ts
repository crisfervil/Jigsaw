

export class JsonPath {


  private static RE_PATTERN:string = "(\\w+)(\\[(\\d+)])?(\\/)?";

  /* returns the path without conditions. Useful to compare two equivalen paths */
  public static RemoveConditions(){

  }

  public static find(object,query:string){
      var foundObject = null;
      if(object&&query){
        var re = new RegExp(JsonPath.RE_PATTERN,"g");
        var m = re.exec(query);
        if(m&&m.length>0){
          var fullQueryPart = m[0];
          if(fullQueryPart) {
            var propName = m[1];
            var propIndex = m[3]

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
      return foundObject;
  }
}
