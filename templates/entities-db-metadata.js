// item: app/entities/item[connection.type="metadata"]
// output: app/db/entities/<%= currentItem.id %>.js
// <%= output("app/db/entities/" + currentItem.id + ".js") %>
/** db layer for metadata entity <%= currentItem.name %>, application <%= appDef.name %> */
var jsonDb = require("../jsonDB");
var path = require("path");

var DbObject = (function () {
	function DbObject(){
        this.db=jsonDb.instance;
        if(!this.db.dbPath()){
            // this operation is async
            this.db.load(path.join(process.cwd(), "data/app.json"));
        }
    };

    DbObject.prototype.select=function(criteria){
        // TODO: calculate path from model
        var itemsPath="entities";
        return this.db.select(itemsPath);
    }

    return DbObject;
})();
module.exports.DbObject=DbObject;
module.exports.instance=new DbObject();
