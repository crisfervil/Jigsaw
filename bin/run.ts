#! /usr/bin/env node
/// <reference path="typings/tsd.d.ts" />

import {Builder} from "../build/builder"
import path = require("path");

var cmdLineArgs = process.argv;

function showHelp(){
	console.log("USE: gm install")
}

function install(workingDir:string){
	console.log("Installing GreenMouse...");
	var builder = new Builder(workingDir);
	console.log("working dir: %s", workingDir);
	// run builder
	builder.build();
	console.log("done");
}

if(cmdLineArgs.length>1){
	var workingDir = process.cwd();
	var command = cmdLineArgs[2];
	if(command=="install"){
		install(workingDir);
	}
	else{
		console.log("Wrong parameters");
		showHelp();
	}
}
else{
	console.log("Wrong parameters");
	showHelp();
}
