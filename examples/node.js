/*
 * node.js: Simple example for using the `node` interactive terminal with spectcl.
 *
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var spectcl = require('../lib/spectcl');

spectcl.spawn("node --interactive")
       .expect(">")
       .sendline("console.log('testing')")
       .expect("testing")
       .sendline("process.exit()")
       .run(function (err) {
         if (!err) {
           console.log("node process started, console logged, process exited");
         }
         else {
           console.log(err);
         }
       });
