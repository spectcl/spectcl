#!/usr/bin/env node
/*
 * echo.js: Simple example for using the `echo` command with spectcl.
 *
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var spectcl = require('../lib/spectcl');

spectcl.spawn("echo", ["hello"])
       .expect("hello")
       .run(function (err) {
          if (!err) {
            console.log("hello was echoed");
          }
       });
