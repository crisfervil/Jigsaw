// item: app/entities/item[context.currentItem.connection.type=="metadata"]
// output: app/entities/<%=currentItem.id%>.js
/** entity manager for entity <%= currentItem.name %>, application <%= appDef.name %> */
var jsonDb = require("../db/jsonDB");
var path = require("path");

var EntityManager = (function () {
	function EntityManager(){
        this.db=jsonDb.instance;
        if(!this.db.dbPath()){
            // this operation is async
            this.db.load(path.join(process.cwd(), "data/app.json"));
        }
    };

    EntityManager.prototype.select=function(criteria){
        // TODO: calculate path from model
        var itemsPath="entities";
        return this.db.select(itemsPath);
    }

    return EntityManager;
})();
module.exports.EntityManager=EntityManager;
module.exports.instance=new EntityManager();
