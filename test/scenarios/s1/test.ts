/// <reference path="../../../typings/main.d.ts" />
import {Builder} from "../../../core/builder"
import assert = require("assert");
import path = require("path");


describe("Integration tests",function(){
  describe("Empty Scenario", function(){
    it("Loads in clean environment",function(done){
        var builder = new Builder(__dirname);
        builder.load()
            .then(()=>{ assert.ok(builder.installedModules);
                        assert.deepEqual(builder.installedModules, []);
                        done(); })
            .catch(error=>{done(error);});
    });
  });
});
