#!/usr/bin/env node
/*
 * nested.js: Simple example showing use of nested expect calls with callbacks.
 *     Note that as with the TCL equivelent, this is a bit of an anti-pattern.
 *            
 *
 * (C) 2015, Ryan Milbourne, ViaSat Inc.
 *
 */

var Spectcl = require('../lib/spectcl')

var session = new Spectcl()

session.spawn('node --interactive')
session.expect([
    />/, function(match, outer_cb){
        session.send('console.log(\'testing\')\r')
        session.expect([
            '>', function(match, inner_cb){
                session.send('process.exit()\r')
                inner_cb()
            }
        ], function(err){
            console.log('output was:\n%s',session.expect_out.buffer)
            outer_cb()
        })
    }
], function(err){
    console.log('all done')
})
