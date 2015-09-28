# spectcl [![Build Status](https://travis-ci.org/spectcl/spectcl.svg)](https://travis-ci.org/spectcl/spectcl) [![Coverage Status](https://coveralls.io/repos/spectcl/spectcl/badge.svg)](https://coveralls.io/r/spectcl/spectcl) [![NPM](https://nodei.co/npm/spectcl.png?compact=true)](https://nodei.co/npm/spectcl/)

`spectcl` (pronounced spectacle) is a node.js module for spawning child applications
(such as ssh) and seamlessly controlling them using javascript callbacks. `spectcl`
is based on the ideas of the [Expect][0] library by Don Libes and the [pexpect][1]
library by Noah Spurrier.

## Motivation

Node.js has good built in control for spawning child processes. `nexpect` built on
those methods that allowed developers to easily pipe data to child processes and
assert the expected response.

`spectl` stands on the shoulders of `nexpect`; one of this module's main goals is
to more closely emulate the Expect extensions built into the TCL language. Its
concentration is to map the functionality and features of the [Expect][0] library
as closely as possible, while adhering to an event-driven control flow.

## Installation

``` bash
  $ npm install --save spectcl
```

## Usage

``` js
var spectcl = require('spectcl')
  , session = new spectcl()

session.spawn('node --interactive')
session.expect([
    '>', function(){
        session.send('process.version\n')
        session.expect([
            '>', function(){
                session.send('process.exit()\n')
                var version = session.expect_out.buffer.match(/(v[0-9]\.[0-9]+\.[0-9]+)/)[1]
                console.log('version is: %s', version)
            }
        ]}
    }
])
```

Usage is similar to Expect, but not identical.  
In the example above, we spawn a `node` interactive interpreter, 
have it output the value of `process.version`, 
capture the results from the expect_out buffer, and close the session, printing the version.

Compare to this TCL Expect block:

``` tcl
package require Expect

log_user 0

spawn node "--interactive"
expect ">" {
    exp_send "process.version\n"
}
expect ">" {
    exp_send "process.exit()\n"
    regexp {(v[0-9]\.[0-9]+\.[0-9]+)} $expect_out(buffer) -> version
    puts "version is: $version"
}
```

## Examples

The [examples](examples) directory contains spectcl code examples, as well as their TCL Expect equivalents.

## API Reference

Watch this space. (See #2)

## Tests

All tests are written with [mocha][4]:

``` bash
  $ npm test
```

## Authors

[Greg Cochard][5] and [Ryan Milbourne][6]

Originally forked from [nodejitsu/nexpect][7] by [Elijah Insua][8], [Marak Squires][9], and [Charlie Robbins][10].

[0]: http://www.tcl.tk/man/expect5.31/expect.1.html
[1]: http://pexpect.sourceforge.net/pexpect.html
[2]: https://github.com/spectcl/spectcl/tree/master/examples
[3]: https://github.com/spectcl/spectcl/tree/master/test/spectcl.js
[4]: http://mochajs.org
[5]: https://github.com/gcochard
[6]: https://github.com/ryanbmilbourne
[7]: http://github.com/nodejitsu/nexpect
[8]: http://github.com/tmpvar
[9]: http://github.com/marak
[10]: http://github.com/indexzero
