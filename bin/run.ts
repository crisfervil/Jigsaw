//#! /usr/bin/env node

import {Builder} from "../core/builder"
import {Obj} from "../util/obj";
import path = require("path");
import fs = require("fs");

var cmdLineArgs = process.argv;
var builder = new Builder(process.cwd());

function showHelp() {
    console.log("USE: jigs help");
    console.log("Shows this help");
    console.log("USE: jigs build");
    console.log("Builds the current project");
    console.log("USE: jigs show");
    console.log("Loads the defined modules, puts together all the definitions and validates the results. Also shows all loades tasks and templates.");
    console.log("USE: jigs save module-name <configPath>");
    console.log("Saves the specified module as an installed jigsaw module in the package.json file of the specified directory");
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

function saveInstalledModule(moduleName: string, dirPath?:string) {
    var myModuleId = path.join(process.cwd(), dirPath, "package.json");
    var myPackageJson = Obj.tryGetModule(myModuleId);

    // TODO: Create package.json if it doesn't exists 
    // TODO: If the file exist, but it can't be parsed, throw an error

    if (!myPackageJson) {
        myPackageJson = {};
    }
    if (!myPackageJson.config) {
        myPackageJson.config = {};
    }
    if (!myPackageJson.config.jigsaw) {
        myPackageJson.config.jigsaw = {};
    }
    if (!myPackageJson.config.jigsaw.packages) {
        myPackageJson.config.jigsaw.packages = [];
    }

    var packages = myPackageJson.config.jigsaw.packages;

    if (!Array.isArray(packages)) throw "error saving installed package";

    if (packages.indexOf(moduleName) < 0) {
        packages.push(moduleName);
    }

    // save file
    fs.writeFile(myModuleId, JSON.stringify(myPackageJson, null, "\t"),err=>{
        if(err) {
            console.log(err);
        }
    });
}

function show() {
    builder.load() // load before listing things
        .then(() => {
            console.log("templates:");
            var templatesString = JSON.stringify(builder.templateManager.templates(), ["id", "path", "module", "selector", "outputPath"], 2);
            console.log(templatesString);

            console.log("tasks:");
            var tasksString = JSON.stringify(builder.taskManager.tasks(), null, 2);
            console.log(tasksString);
        })
        .catch(console.log);
}

function wrongParameters() {
    console.log("Wrong parameters");
    showHelp();
}

if (cmdLineArgs.length > 1) {
    var command = cmdLineArgs[2];
    switch (command) {
        case "help":
            showHelp();
            break;
        case "build":
            build();
            break;
        case "show":
            show();
            break;
        case "save":
            if(cmdLineArgs[3]) {
                saveInstalledModule(cmdLineArgs[3],cmdLineArgs[4]);
            }
            else {
                wrongParameters();
            }
            break;
        default:
            wrongParameters();
    }
}
else {
    wrongParameters();
}
