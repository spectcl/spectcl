/*
 * ls-la.js: Simple example for using the `ls -la` command with spectcl.
 *
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var spectcl = require('../lib/spectcl');

spectcl.spawn("ls -la /tmp/undefined", { stream: 'stderr' })
       .expect("No such file or directory")
       .run(function (err) {
          if (!err) {
            console.log("checked that file doesn't exists");
          }
       });
