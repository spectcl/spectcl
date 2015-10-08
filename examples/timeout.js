#!/usr/bin/env node

/*
 * timeout.js: Simple example for expecting a timeout.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne, ViaSat Inc.
 *
 */

var Spectcl = require('../lib/spectcl')

var session = new Spectcl({timeout: 5000})

session.spawn('node --interactive')
session.expect([
    /foo/, function(match, cb){
            console.log('foo was echoed')
            //we'll never get here!
            cb()
    },
    session.TIMEOUT, function(match, cb){
        session.send('exit\r')
        cb('timeout')
    }
], function(err){
    if(err){
        console.log('exp error: %s',err)
        process.exit(1)
    }
    console.log('all done')
    process.exit()
});

