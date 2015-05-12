/*
 * ignoreCase.js: Simple example for using the `ignoreCase` option with spectcl.
 *
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var path = require('path'),
    spectcl = require('../lib/spectcl');

spectcl.spawn(path.join(__dirname, '..', 'test', 'fixtures', 'multiple-cases'), { ignoreCase: true })
       .wait('this has many cases')
       .expect('this also has many cases')
       .run(function (err) {
         if (!err) {
           console.log('multiple cases were waited and expected');
         }
       });
