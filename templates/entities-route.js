// <% output("app/routes/entities/" + currentItem.name + ".js") %>
/** router for entity <%= currentItem.name %>, application <%= appDef.name %> */

var express = require('express');
var app = express();

app.get('/', function(req, res) {
});