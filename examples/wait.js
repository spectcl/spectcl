/*
 * wait.js: Simple example for using the `.wait()` method with spectcl.
 *
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var path = require('path'),
    spectcl = require('../lib/spectcl');

spectcl.spawn(path.join(__dirname, '..', 'test', 'fixtures', 'prompt-and-respond'), { stripColors: true })
       .wait('first')
       .sendline('first-prompt')
       .expect('first-prompt')
       .wait('second')
       .sendline('second-prompt')
       .expect('second-prompt')
       .run(function (err) {
         if (!err) {
           console.log('two prompts were waited and responded to');
         }
       });
