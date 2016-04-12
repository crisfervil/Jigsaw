//#! /usr/bin/env node

/// <reference path="../typings/main.d.ts" />

import {Builder} from "../core/builder"
import {Obj} from "../util/obj";
import path = require("path");
import fs = require("fs");

var cmdLineArgs = process.argv;
var builder = new Builder(process.cwd());

function showHelp() {
    console.log("USE: jigs build")
    console.log("Builds the current project")
    console.log("USE: jigs show")
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

function link(args:string[]){
  var packageId = args[0]; // the first parameter must be the package name
  const command = ['npm','link'].concat(args).join(' ');
  const exec = require('child_process').execSync;

  // TODO: handle errors
  const stdout:Buffer = exec(command);

  console.log(stdout.toString());

  // review the installed package.json and install all dependencies
  var installedModuleId = path.join(process.cwd(), "node_modules",packageId,"package.json");
  var installedPackageJson = Obj.tryGetModule(installedModuleId);
  if(installedPackageJson&&installedPackageJson.config&&installedPackageJson.config.jigsaw&&installedPackageJson.config.jigsaw.dependencies){
      var dependencies = installedPackageJson.config.jigsaw.dependencies;
      for(var propName in dependencies){
        installDependency(propName, dependencies[propName]);
      }
  }
  else {
    console.log("no dependencies found");
  }
  //after intsall, save installed module
  saveInstalledModule(packageId);
}


function saveInstalledModule(moduleName:string){
  var myModuleId = path.join(process.cwd(), "package.json");
  var myPackageJson = Obj.tryGetModule(myModuleId);

  // TODO: Create package.json if it doesn't exists 
  // TODO: If the file exist, but it can't be parsed, throw an error

  if(!myPackageJson){
    myPackageJson = {};
  }
  if(!myPackageJson.config){
    myPackageJson.config = {};
  }
  if(!myPackageJson.config.jigsaw){
    myPackageJson.config.jigsaw = {};
  }
  if(!myPackageJson.config.jigsaw.packages){
    myPackageJson.config.jigsaw.packages = [];
  }

  var packages = myPackageJson.config.jigsaw.packages;

  if(!Array.isArray(packages)) throw "error saving installed package";

  if(packages.indexOf(moduleName)<0){
    packages.push(moduleName);
  }

  // save file
  fs.writeFileSync(myModuleId,JSON.stringify(myPackageJson,null,"\t"));

}

function installDependency(moduleName:string, version:string){
  console.log(`installing ${moduleName} ${version}...`)
  if(version=="link"){
    link([moduleName]);
  }
}

function install(args:string[]){
  console.log(args);
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
        case "build":
            build();
            break;
        case "show":
            show();
            break;
        case "install":
            install(cmdLineArgs.slice(3));
            break;
        case "link":
            link(cmdLineArgs.slice(3));
            break;
        default:
            wrongParameters();
    }
}
else {
    wrongParameters();
}
