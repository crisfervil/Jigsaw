/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/custom.d.ts" />

import fs_node = require("fs");
import path = require("path");

export class fs {
    private static _0777 = parseInt('0777', 8);

    public static exists(path: string): Promise<boolean> {
        return new Promise<boolean>(resolve=> {
            fs_node.exists(path, x=> resolve(x))
        });
    }

    public static readdir(path: string) {
        return new Promise<string[]>((resolve, reject) => {
            fs_node.readdir(path, (err, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }
            });
        });
    }

    public static readFile(path: string) {
        return new Promise<Buffer>((resolve, reject) => {
            fs_node.readFile(path, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    public static writeFile(obj, path: string) {
        return new Promise((resolve, reject) => {
            fs_node.writeFile(path, obj, error=> { if (error) reject(error); else resolve(); });
        });
    }

    /**
     * Saves the specified object as a json file in the specified path. 
     * Creates the directory if doesn't exist
     */
    public static saveJSON(obj, destPath: string) {
        return new Promise((resolve,reject)=>{
            var objStr = JSON.stringify(obj, null, 4);
            var dirPath = path.dirname(destPath);
            fs.mkdirP(dirPath,error=>{
                if(!error)
                    fs.writeFile(objStr, destPath).then(resolve);
                else
                    reject(error);
            });
        });
    }

    //TODO: Improve this. Return a Promise
    public static mkdirP(p, opts, f?, made?) {
        if (typeof opts === 'function') {
            f = opts;
            opts = {};
        }
        else if (!opts || typeof opts !== 'object') {
            opts = { mode: opts };
        }

        var mode = opts.mode;
        var xfs = opts.fs || fs_node;

        if (mode === undefined) {
            mode = this._0777 & (~process.umask());
        }
        if (!made) made = null;

        var cb = f || function() { };
        p = path.resolve(p);

        xfs.mkdir(p, mode, function(er) {
            if (!er) {
                made = made || p;
                return cb(null, made);
            }
            switch (er.code) {
                case 'ENOENT':
                    fs.mkdirP(path.dirname(p), opts, function(er, made) {
                        if (er) cb(er, made);
                        else fs.mkdirP(p, opts, cb, made);
                    });
                    break;

                // In the case of any other error, just see if there's a dir
                // there already.  If so, then hooray!  If not, then something
                // is borked.
                default:
                    xfs.stat(p, function(er2, stat) {
                        // if the stat fails, then that's super weird.
                        // let the original error be the failure reason.
                        if (er2 || !stat.isDirectory()) cb(er, made)
                        else cb(null, made);
                    });
                    break;
            }
        });
    }

}