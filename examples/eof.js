#!/usr/bin/env node

/*
 * eof.js: Simple example for expecting eof.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne, ViaSat Inc.
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var Spectcl = require('../lib/spectcl')

var session = new Spectcl({timeout: 5000})

session.spawn('echo hello', [], {}, {noPty:true})
session.expect([
    /goodbye/, function(match, matched, cb){
        console.log('goodbye was echoed')
        cb()
    },
    session.EOF, function(match, matched, cb){
        cb('eof')
    }
], function(err){
    if(err){
        console.log('exp error: %s',err)
        process.exit(1)
    }
    console.log('all done')
    process.exit()
});

