
/// <reference path="../typings/index.d.ts" />

import express = require('express');

export class UIServer{

    public run(){
        var app = express();

        app.use(express.static('ui/public'));

        app.get('/', function (req, res) {
            res.send('Hello World!');
        });

        app.listen(3000, function () {
            console.log('Jigwaw editor runnin on port 3000!');
        });
    }
}