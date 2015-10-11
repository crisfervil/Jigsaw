// for: app/entities/item
// output: app/routes/entities/{currentItem.id}.js
// <%= output("app/routes/entities/" + currentItem.id + ".js") %>
/** router for entity <%= currentItem.name %>, application <%= appDef.name %> */

var db=require("../../../app/db/entities/<%= currentItem.id %>");

function configureRoutes (app){
    app.get('/api/<%= currentItem.id %>', function(req, res) {
        // TODO: Get filter from request
        var filter=null ;
        var result = db.instance.select(filter);
        res.send(result);
    });

    app.get('/api/<%= currentItem.id %>/{id}', function(req, res) {
    });

    app.post('/api/<%= currentItem.id %>/create', function(req, res) {
    });

    app.post('/api/<%= currentItem.id %>/update', function(req, res) {
    });
};

module.exports = configureRoutes;
