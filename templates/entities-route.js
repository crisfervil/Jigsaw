// item: app/entities/item
// output: app/routes/entities/<%= currentItem.id %>.js
// <%= output("app/routes/entities/" + currentItem.id + ".js") %>
/** router for entity <%= currentItem.name %>, application <%= appDef.name %> */

var express = require('express');
var app = express();

app.get('/api/<%= currentItem.id %>/', function(req, res) {
});

app.get('/api/<%= currentItem.id %>/{id}', function(req, res) {
});

app.post('/api/<%= currentItem.id %>/create', function(req, res) {
});

app.post('/api/<%= currentItem.id %>/update', function(req, res) {
});