// item: app/entities/item[context.currentItem.connection && context.currentItem.connection.type=="metadata"]
// output: app/entities/<%=currentItem.id%>.js
/** entity manager for entity <%= currentItem.name %>, application <%= appDef.name %> */
var jsonDb = require("../db/jsonDB");
var path = require("path");

var EntityManager = (function () {

var dbPath = path.join(process.cwd(), "data/app.json");

	function EntityManager(){
        this.db=jsonDb.instance;
    };

    EntityManager.prototype.select=function(criteria){
				return new Promise(function (resolve, reject) {

					// TODO: calculate path from model
					//var itemsPath="<%=currentItemPath%>";
	        var itemsPath="entities";
					var returnValue;

					if(!this.db.dbPath()){
						this.db.load(dbPath)
						.then(function(){
							returnValue = this.db.select(itemsPath);
 						 resolve(returnValue);
						})
						.catch(reject);
					}
					else {
		         returnValue = this.db.select(itemsPath);
						 resolve(returnValue);
					}
				});
    }
})();

module.exports.EntityManager=EntityManager;
module.exports.instance=new EntityManager();
