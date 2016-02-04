#!/usr/bin/env node

/*
 * echo.js: Simple example for using the `echo` command with spectcl.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne, ViaSat Inc.
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var Spectcl = require('../lib/spectcl')

var session = new Spectcl({timeout: 5000})

session.spawn('echo', ['hello'])
session.expect([
    /hello/, function(match, matched, cb){
            console.log('hello was echoed')
            cb()
    },
], function(err){
    if(err){
        console.log('exp error: %s',err)
        process.exit(1)
    }
    console.log('all done')
    process.exit()
});

