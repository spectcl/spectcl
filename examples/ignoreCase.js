#!/usr/bin/env node
/*
 * ignoreCase.js: Simple example showing how to ignore case within expect
 * by using RegExp ignore flag.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne, ViaSat Inc.
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var Spectcl = require('../lib/spectcl')

var session = new Spectcl()

session.spawn('echo', ['hElLo'])
session.expect([
    /hello/i, function(){
        console.log('hello was echoed')
    }
]);
