'use strict'
/*
 * spectcl.js: Top-level include for the `spectcl` module.
 *
 * (C) 2015, Greg Cochard, Ryan Milbourne
 * (C) 2011, Elijah Insua, Marak Squires, Charlie Robbins.
 *
 */

var spawn = require('child_process').spawn
var util = require('util')
var AssertionError = require('assert').AssertionError
var EventEmitter = require('events').EventEmitter

function testExpectation(data, expectation) {
    if (util.isRegExp(expectation)) {
        return expectation.test(data)
    }
    return data.indexOf(expectation) > -1
}

function createUnexpectedEndError(message, remainingQueue) {
    var desc = remainingQueue.map(function(it) { return it.description })
    var msg = message + '\n' + desc.join('\n')
    return new AssertionError({
        message: msg,
        expected: [],
        actual: desc
    })
}

function createExpectationError(expected, actual) {
    var expectation
    if (util.isRegExp(expected)){
        expectation = 'to match ' + expected
    } else {
        expectation = 'to contain ' + JSON.stringify(expected)
    }

    var err = new AssertionError({
        message: util.format('expected %j %s', actual, expectation),
        actual: actual,
        expected: expected
    })
    return err
}

module.exports = function Spectcl(options){
    options = options || {};
    //Some private things
    var cache = ''

    //Public things here
    return {
        /**
         * Output object accessible by the user.
         * buffer contains all data on the stream between the previous two matches.
         * This object is meant to emulate TCL Expect's expect_out behavior.
         * For more, see http://www.tcl.tk/man/expect5.31/expect.1.html
         */
        expect_out: {
            buffer: ''
        },

        options: options,


        /**
         * Spawns the Expect session's child process
         * @param {string|Array} command - The command to spawn.  If string, will be split on ' ' if params not provided.
         * @param {Array} [cmdParams] - Argv to pass to the child process.
         * @param {Object} cmdOptions - Options used when spawning the child.
         */
        spawn: function(command, cmdParams, cmdOptions){
        },


        /**
         * Called after the expectation matches.  
         * @callback Spectcl~expectCallback
         * @param {string|Object} match - Contains results of RegExp match or String that matched expectation.
         * @returns {Number} Can optionally return Spectcl~CONTINUE, which will trigger exp_continue-like behavior.
         */

        /**
         * Wait until given pattern matches output of the spanwed process.
         * @param {string|Object} expectation - String or RegExp object containing pattern to match.
         * @param {Spectcl~expectCallback} callback - Callback to call upon match
         * @param {...string|Object} expectationN - expect takes one or more pairs of expectations/callbacks.
         * @param {...Spectcl~expectCallback} callbackN - expect takes one or more pairs of expectations/callbacks.
         */
        expect: function(){
            var self = this
              , expectCallbacks = arguments

            if(!expectations.length){
                return
            }

            //For each expectation/callback pair, add to the current expects object.
            for(var i=0; i<expectations.length; i+=2){
                var expectation = expectCallbacks[i]
                  , expCallback = expectCallbacks[i+1]

                //Type checking of expectation/callback pairing
                //Note: need to add special spectcl.TIMEOUT|EOF|ETC enumerated types
                if(typeof expectation !== 'string' && !(expectation instanceof RegExp)){
                    self.emit('error', new Error('valid expecations are string or RegExp'))
                    return
                }
                if(typeof expCallback !== 'function'){
                    self.emit('error', new Error('received non-function as expect callback'))
                    return
                }
            }
        },


        /**
         * Sends a line to the spawned process
         * @param {string} line - Line to send to the current spawned process.
         */
        sendLine: function(line){
        },

        /**
         * Close the spawned process' stdin stream
         */
        sendEof: function(){
        }
    }
}

function chain (context) {
    return {
        expect: function (expectation) {
            var _expect = function _expect (data) {
                return testExpectation(data, expectation)
            }

            _expect.shift = true
            _expect.expectation = expectation
            _expect.description = '[expect] ' + expectation
            _expect.requiresInput = true
            context.queue.push(_expect)

            return chain(context)
        },
        wait: function (expectation, callback) {
            var _cache = '';
            var _wait = function _wait (data, context) {
                var val = testExpectation(data, expectation)
                if (val === true && typeof callback === 'function') {
                    /* eslint-disable callback-return */
                    //We want to wait for the evalContext fn to
                    //modify the expect_out and fire before calling the callback
                    if(context){
                        context.once('wait', function(data){
                            /* eslint-disable callback-return */
                            callback(data)
                            /* eslint-enable callback-return */
                        });
                    } else {
                        /* eslint-disable callback-return */
                        callback(data)
                        /* eslint-enable callback-return */
                    }
                }
                return val
            }

            _wait.shift = false
            _wait.expectation = expectation
            _wait.description = '[wait] ' + expectation
            _wait.requiresInput = true
            context.queue.push(_wait)
            return chain(context)
        },
        on: function() {
            context.on.apply(this, arguments)
        },
        sendline: function (line) {
            var _sendline = function _sendline () {
                context.process.stdin.write(line + '\n')

                    context.expect_out
                if (context.verbose) {
                    process.stdout.write(line + '\n')
                }
            }

            _sendline.shift = true
            _sendline.description = '[sendline] ' + line
            _sendline.requiresInput = false
            context.queue.push(_sendline)
            return chain(context)
        },
        sendEof: function() {
            var _sendEof = function _sendEof () {
                context.process.stdin.destroy()
            }
            _sendEof.shift = true
            _sendEof.description = '[sendEof]'
            _sendEof.requiresInput = false
            context.queue.push(_sendEof)
            return chain(context)
        },
        run: function (callback) {
            var errState = null,
                responded = false,
                stdout = [],
                cache = '',
                options,
                self = this;

            //
            // **onError**
            //
            // Helper function to respond to the callback with a
            // specified error. Kills the child process if necessary.
            //
            function onError (err, kill) {
                if (errState || responded) {
                    return
                }

                errState = err
                responded = true

                if (kill) {
                    try { context.process.kill() }
                    catch (ignore) { }
                }

                return callback(err)
            }

            //
            // **validateFnType**
            //
            // Helper function to validate the `currentFn` in the
            // `context.queue` for the target chain.
            //
            function validateFnType (currentFn) {
                if (typeof currentFn !== 'function') {
                    //
                    // If the `currentFn` is not a function, short-circuit with an error.
                    //
                    onError(new Error('Cannot process non-function on nexpect stack.'), true)
                    return false
                }

                if (['_expect', '_sendline', '_wait', '_sendEof'].indexOf(currentFn.name) === -1) {
                    //
                    // If the `currentFn` is a function, but not those set by `.sendline()` or
                    // `.expect()` then short-circuit with an error.
                    //
                    onError(new Error('Unexpected context function name: ' + currentFn.name), true)
                    return false
                }

                return true
            }

            //
            // **evalContext**
            //
            // Core evaluation logic that evaluates the next function in
            // `context.queue` against the specified `data` where the last
            // function run had `name`.
            //
            function evalContext (data, name) {
                var currentFn = context.queue[0]

                if (!currentFn || name === '_expect' && currentFn.name === '_expect') {
                    //
                    // If there is nothing left on the context or we are trying to
                    // evaluate two consecutive `_expect` functions, return.
                    //
                    return
                }

                if (currentFn.shift) {
                    context.queue.shift()
                }

                if (!validateFnType(currentFn)) {
                    return
                }

                if (currentFn.name === '_expect') {
                    //
                    // If this is an `_expect` function, then evaluate it and attempt
                    // to evaluate the next function (in case it is a `_sendline` function).
                    //
                    context.emit('expect')
                    return currentFn(data) === true ?
                        evalContext(data, '_expect') :
                        onError(createExpectationError(currentFn.expectation, data), true)
                }

                if (currentFn.name === '_wait') {
                    //
                    // If this is a `_wait` function, then evaluate it and if it returns true,
                    // then evaluate the function (in case it is a `_sendline` function).
                    //
                    if (currentFn(data, context) === true) {
                        //we matched on the Wait, so copy cache to expect_out.buffer and reset cache
                        context.expect_out.buffer = cache
                        cache = ''
                        context.emit('wait',data)
                        context.queue.shift()
                        evalContext(data, '_expect')
                    }
                } else {
                    //
                    // If the `currentFn` is any other function then evaluate it
                    //
                    currentFn()

                    // Evaluate the next function if it does not need input
                    var nextFn = context.queue[0]
                    if (nextFn && !nextFn.requiresInput) {
                        evalContext(data)
                    }
                }
            }

            //
            // **onLine**
            //
            // Preprocesses the `data` from `context.process` on the
            // specified `context.stream` and then evaluates the processed lines:
            //
            // 1. Stripping ANSI colors (if necessary)
            // 2. Removing case sensitivity (if necessary)
            // 3. Splitting `data` into multiple lines.
            //
            function onLine (data) {
                data = data.toString()

                if (context.stripColors) {
                    data = data.replace(/\u001b\[\d{0,2}m/g, '')
                }

                if (context.ignoreCase) {
                    data = data.toLowerCase()
                }

                var lines = data.split(/[\r\n]/).filter(function (line) { return line.length > 0 })
                stdout = stdout.concat(lines)
                cache = cache.concat(data)
                //context.expect_out.buffer = context.expect_out.buffer.concat(data);

                while (lines.length > 0) {
                    evalContext(lines.shift(), null)
                }
            }

            //
            // **flushQueue**
            //
            // Helper function which flushes any remaining functions from
            // `context.queue` and responds to the `callback` accordingly.
            //
            function flushQueue () {
                var remainingQueue = context.queue.slice(),
                    currentFn = context.queue.shift(),
                    lastLine = stdout[stdout.length - 1]

                if (!lastLine) {
                    onError(createUnexpectedEndError(
                        'No data from child with non-empty queue.', remainingQueue))
                    return false
                }

                if (context.queue.length > 0) {
                    onError(createUnexpectedEndError(
                        'Non-empty queue on spawn exit.', remainingQueue))
                    return false
                }

                if (!validateFnType(currentFn)) {
                    // onError was called
                    return false
                }

                if (currentFn.name === '_sendline') {
                    onError(new Error(
                        'Cannot call sendline after the process has exited'))
                    return false
                }

                if (currentFn.name === '_wait' || currentFn.name === '_expect') {
                    if (currentFn(lastLine) !== true) {
                        onError(createExpectationError(currentFn.expectation, lastLine))
                        return false
                    }
                }

                return true
            }

            //
            // **onData**
            //
            // Helper function for writing any data from a stream
            // to `process.stdout`.
            //
            function onData (data) {
                process.stdout.write(data)
            }

            options = {
                cwd: context.cwd,
                env: context.env
            }

            //
            // Spawn the child process and begin processing the target
            // stream for this chain.
            //
            context.process = spawn(context.command, context.params, options)

            if (context.verbose) {
                context.process.stdout.on('data', onData)
                context.process.stderr.on('data', onData)
            }

            if (context.stream === 'all') {
                context.process.stdout.on('data', onLine)
                context.process.stderr.on('data', onLine)
            } else {
                context.process[context.stream].on('data', onLine)
            }

            context.process.on('error', onError)

            //
            // When the process exits, check the output `code` and `signal`,
            // flush `context.queue` (if necessary) and respond to the callback
            // appropriately.
            //
            context.process.on('close', function (code, signal) {
                if (code === 127) {
                    // Not how node works (anymore?), 127 is what /bin/sh returns,
                    // but it appears node does not, or not in all conditions, blithely
                    // return 127 to user, it emits an 'error' from the child_process.

                    //
                    // If the response code is `127` then `context.command` was not found.
                    //
                    return onError(new Error('Command not found: ' + context.command))
                }

                if (context.queue.length && !flushQueue()) {
                    // if flushQueue returned false, onError was called
                    return
                } return callback(null, stdout, signal || code) })

            return context
        }
    }
}

function spectcl (command, params, options) {
    if (arguments.length === 2) {
        // Did we get a params array or an options object as the second parameter?
        if (Array.isArray(params)) {
            options = {}
        }
        else {
            options = params
            params = null
        }
    }

    if (Array.isArray(command)) {
        params = command
        command = params.shift()
    }
    else if (typeof command === 'string') {
        command = command.split(' ')
        params = params || command.slice(1)
        command = command[0]
    }

    options = options || {}
    var context = {
        command: command,
        cwd: options.cwd || undefined,
        env: options.env || undefined,
        ignoreCase: options.ignoreCase,
        params: params,
        queue: [],
        expect_out: { buffer: '' },
        stream: options.stream || 'stdout',
        stripColors: options.stripColors,
        verbose: options.verbose
    }
    var _emitter = new EventEmitter()
    context._emitter = _emitter
    context.on = function(){
        _emitter.on.apply(_emitter,arguments)
    }
    context.once = function(){
        _emitter.once.apply(_emitter,arguments)
    }
    context.emit = function(){
        _emitter.emit.apply(_emitter,arguments)
    }

    return chain(context)
}

