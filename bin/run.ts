//#! /usr/bin/env node

/// <reference path="../typings/main.d.ts" />

import {Builder} from "../core/builder"
import path = require("path");

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
//  const spawn = require('child_process').spawn;
//  const link = spawn('npm.cmd', ['link'].concat(args));

  const command = ['npm','link'].concat(args).join(' ');
  const exec = require('child_process').exec;
  const child = exec(command,
    (error, stdout, stderr) => {
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
      if (error !== null) {
        console.log(`exec error: ${error}`);
      }
  });
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
