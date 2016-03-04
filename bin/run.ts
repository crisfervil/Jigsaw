//#! /usr/bin/env node

/// <reference path="../typings/main.d.ts" />

import {Builder} from "../core/builder"
import path = require("path");

var cmdLineArgs = process.argv;
var builder = new Builder(process.cwd());

function showHelp() {
    console.log("USE: gm build")
    console.log("Builds the current project")
    console.log("USE: gm show")
    console.log("Loads the defined modules, puts together all the definitions and validates the results. Also shows all loades tasks and templates.")
}

function build() {
    builder.load() // Load and then build
        .then(() => {
            console.log("Running build tasks and templates...");
            // run builder
            return builder.build();
        })
        .then(() => console.log("done!"))
        .catch(console.log);
}

function show() {
    builder.load() // load before listing things
        .then(() => {
            console.log("templates:");
            var templatesString = JSON.stringify(builder.templateManager.templates(), ["id", "path", "module", "item", "output", "criteria"], 2);
            console.log(templatesString);

            console.log("tasks:");
            var tasksString = JSON.stringify(builder.taskManager.tasks(), null, 2);
            console.log(tasksString);
        });
}

function wrongParameters() {
    console.log("Wrong parameters");
    showHelp();
}

if (cmdLineArgs.length > 1) {
    var command = cmdLineArgs[2];
    switch (command) {
        case "build":
            build();
            break;
        case "show":
            show();
            break;
        default:
            wrongParameters();
    }
}
else {
    wrongParameters();
}
