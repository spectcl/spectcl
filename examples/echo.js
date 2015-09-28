#!/usr/bin/env node

/*
 * echo.js: Simple example for using the `echo` command with spectcl.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne, ViaSat Inc.
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var Spectcl = require('../lib/spectcl')

var session = new Spectcl()

session.spawn('echo', ['hello'])
session.expect([
    /hello/, function(){
        console.log('hello was echoed')
    }
]);

