#!/usr/bin/env node
/*
 * node.js: Simple example for using spectcl to interact with a session
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne, ViaSat Inc.
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var Spectcl = require('../lib/spectcl')

var session = new Spectcl()

session.on('exit', function(){
    process.exit()
})

session.spawn('node --interactive')
session.expect([
    />/, function(match, matched, cb){
        session.send('console.log(\'testing\')\r')
        cb()
    }
], function(){
    session.expect([
        '>', function(match, matched, cb){
            session.send('process.exit()\r')
            console.log('output was:\n%s',session.expect_out.buffer)
            cb()
        }
    ], function(err){
        console.log('all done')
    })
})
