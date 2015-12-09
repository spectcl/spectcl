# spectcl [![Build Status](https://travis-ci.org/spectcl/spectcl.svg)](https://travis-ci.org/spectcl/spectcl) [![Coverage Status](https://coveralls.io/repos/spectcl/spectcl/badge.svg)](https://coveralls.io/r/spectcl/spectcl) [![NPM](https://nodei.co/npm/spectcl.png?mini=true)](https://nodei.co/npm/spectcl/) [![Follow Spectcl](https://img.shields.io/twitter/follow/spectcl.svg?style=social)](https://twitter.com/intent/follow?screen_name=spectcl)

`spectcl` (pronounced spectacle) is a node.js module for spawning child applications
(such as ssh) and seamlessly controlling them using javascript callbacks. `spectcl`
is based on the ideas of the [Expect][0] library by Don Libes and the [pexpect][1]
library by Noah Spurrier.

**Note that this module is under initial development.
The API is subject to change until we reach the 
[v1.0.0 Milestone](https://github.com/spectcl/spectcl/milestones/v1.0.0).**

## Motivation

Node.js has good built in control for spawning child processes. `nexpect` built on
those methods that allowed developers to easily pipe data to child processes and
assert the expected response.

`spectl` stands on the shoulders of `nexpect`; one of this module's main goals is
to more closely emulate the Expect extensions built into the Tcl language. Its
concentration is to map the functionality and features of the [Expect][0] library
as closely as possible, while adhering to an event-driven control flow.

## Installation

``` bash
  $ npm install --save spectcl
```

## Usage

``` js
var Spectcl = require('spectcl')
  , session = new Spectcl()

session.spawn('node --interactive')
session.expect([
    '>', function(match, cb){
        session.send('process.version\n')
        cb()
    }
], function(err){
    session.expect([
        '>', function(match, cb){
            session.send('process.exit()\n')
            cb()
        }
    ], function(err){
        var version = session.expect_out.buffer.match(/(v[0-9]\.[0-9]+\.[0-9]+)/)[1]
        console.log('version is: %s', version)
    })
})
```

In the example above, we spawn a `node` interactive interpreter, have it output the
value of `process.version`, and send `process.exit()`.  We capture the results from
the expect_out buffer, and close the session, printing the version in the final
callback.

Compare to this Tcl Expect block:

``` tcl
package require Expect

log_user 0

spawn node "--interactive"
expect ">" {
    exp_send "process.version\n"
}
expect ">" {
    exp_send "process.exit()\n"
}
regexp {(v[0-9]\.[0-9]+\.[0-9]+)} $expect_out(buffer) -> version
puts "version is: $version"
```

## Getting Started

```js
var session = new Spectcl()
```

A spectcl object exposes two main functions: spawn and expect.  A Spectcl object is intended to only have
one spawned child at a time.  To operate concurrently on many sessions, you will need to spawn an object
for each concurrent session.

### spawn()

This function is used to spawn the child session that you'll be expecting on.  Note that like Tcl Expect,
by default your child will be wrapped in a pseudoterminal. Some sessions, like Telnet, are not sensitive
to having a pty, and as such can be spawned without a pty if desired.  You can do that like so:

```js
session.spawn('echo', ['hello'], {}, {noPty: true})
```

The Spectcl object will emit `exit` when the child is complete, and `error` if there is an issue spawning
the child.

### expect()

This function will wait for data from the stream to match one of the expectations you specify.
It takes an array and a final callback, structured like so:

```js
session.expect([
    'hello', function(){
        // handle hello here
        cb()
    }
], function(){
    console.log('all done!')
})
```

The array needs to be even in length.  The even indices are your "expectations".  These can be of type
String or Regexp, and are things that you want to match on.  The odd indices will be the handler functions
for the expectation that precedes it.  In the example above, we are going to match on `/hello/`.  When we
do, the handler function is called.  

The handler functions will be called with the match object (Either a String or the Match object from the
RegExp test), and the final callback.

Like Tcl Expect, `expect()` will wait until a match occurs, a specified period of time has elapsed,
or EOF is seen.  The timeout period can be specified when creating the Spectcl object by specifying a
timeout property in the options object.  The default period is 30s.  

This specifies the timeout period, in ms:
```js
var session = new Spectcl({timeout: 5000})
```

...and you can expect TIMEOUT or EOF like so:

```js
session.expect([
    session.TIMEOUT, function(match, cb){
        cb(new Error('timeout'))
    },
    session.EOF, function(match, cb){
        cb(new Error('eof'))
    }
], function(err){
    if(err){ console.log(err) }
})
``` 

In the above sample, we are expecting to see either a TIMEOUT or an EOF, and can handle it appropriately.
It is important to note that if you do not expect TIMEOUT or EOF and one occurs, the final callback will
be called, with no Error:

```js
session.expect([
    /foo/, function(match, cb){
        // do things
        cb()
    }
], function(err){
    if(err){ console.log(err) }
})
``` 

In the above example, if the session is ended abruptly or if it is inactive for the specified period of
time, then the final callback will be called directly, since no handler was specified for either case.

This design mirrors Tcl Expect's `expect` procedure, which returns immediately for these cases if they
are not expected.

## Examples

The [examples](examples) directory contains spectcl code examples, as well as their Tcl Expect equivalents.


## API Reference

The Spectcl API is documented on [spectcl.github.io](https://github.com/spectcl/spectcl.github.io/blob/master/api.html).

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
