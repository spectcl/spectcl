#!/usr/bin/env node
/*
 * stripColors.js: Simple example for using the `stripColors` option with spectcl.
 *
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var path = require('path'),
    spectcl = require('../lib/spectcl');

spectcl.spawn(path.join(__dirname, '..', 'test', 'fixtures', 'log-colors'), { stripColors: true })
       .wait('second has colors')
       .expect('third has colors')
       .run(function (err) {
         if (!err) {
           console.log('colors were ignore, then waited and expected');
         } else {
             console.log(err);
         }
       });
