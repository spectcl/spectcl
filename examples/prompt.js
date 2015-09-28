#!/usr/bin/env node
/*
 * wait.js: Simple example for working with an interactive prompting session.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne, ViaSat Inc.
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var path = require('path')
  , Spectcl = require('../lib/spectcl')

var session = new Spectcl()
session.on('error', function(err){
    console.log(err)
})

session.spawn(path.join(__dirname, '..', 'test', 'fixtures', 'prompt-and-respond'))
session.expect([
    /first/, function(){
        session.send('first-response\r')
        session.expect([
            /second/, function(){
                session.send('second-response\r')
                console.log('two prompts were waited for and responded to')
            }
        ])
    }
])
