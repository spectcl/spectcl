#!/usr/bin/env node
/*
 * ls-la.js: Simple example for using the `ls -la` command with spectcl.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne, ViaSat Inc.
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var Spectcl = require('../lib/spectcl');

var session = new Spectcl()

session.spawn('ls -la /tmp/undefined', { stream: 'stderr' })
session.expect([
    'No such file or directory', function(match, matched, cb){
        cb(new Error('That file/dir doesn\'t exist!'))
    }
], function(err){
    if(err){
        console.log(err)
    }
    console.log('all done')
})
