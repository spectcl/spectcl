/* eslint-env node, mocha */

'use strict'

var assert = require('assert')
  , Spectcl = require('../lib/spectcl')
  , _ = require('lodash')
  , mockSpawn = require('mock-spawn')
  , vm = require('vm')

// set up the mock spawn object
var mySpawn = mockSpawn()
  , myPtySpawn = mockSpawn()
  , ttycount = 0

require('child_process').spawn = mySpawn
require('child_pty').spawn = myPtySpawn

function nodeRepl(command){
    return vm.runInNewContext(command) + '\n'
}

mySpawn.setDefault(mySpawn.simple(0,'hello'))
mySpawn.setStrategy(function (command, args) {
    switch(command){
    case 'defnotacommand':
        return function(cb){
            this.emit('error', 'error')
            return cb(8)
        }
    case 'echo':
        if(args instanceof Array){
            args = args.join(' ')
        }
        return mySpawn.simple(0,args)
    case 'node':
        return function(cb){
            var self = this
            this.stdin.destroy = function(){
                return cb(0)
            }
            this.stdout.write('>')
            this.stdin.on('data',function(s){
                if(s instanceof Buffer){
                    s = s.toString('utf8')
                }
                if(/^process.exit\(\)/.test(s)){
                    return cb(0)
                }
                var out = nodeRepl(s)
                self.stdout.write(out)
                self.stdout.write('>')
            })
        }
    case 'ls':
        if(args[0] === '-G'){
            return mySpawn.simple(0, '\u001b[33mHello\nWorld\u001b[0m')
        }
        break
    case 'bash':
        switch(args){
        case 'fixtures/test_exp_continue.sh':
        default:
            return function(cb){
                var self = this
                self.stdout.write('"Connecting" to a server:\n')
                self.stdout.write('user:')
                self.stdin.on('data', function(d){
                    d = (d.toString('utf8') || d).trim()
                    switch(d){
                    case 'foo':
                        return self.stdout.write('password:')
                    case 'bar':
                        return self.stdout.write('\n[foo@test-server]$ ')
                    case 'exit':
                        self.stdout.write('output\n')
                        self.stdout.write('exiting...')
                        return cb(0)
                    default:
                        return cb(1)
                    }
                })
            }
        }
        break
    default:
        return mySpawn.simple(0,'hello world')
    }
})

myPtySpawn.setSignals({SIGTERM:true})
myPtySpawn.setStrategy(function (command, args) {
    switch(command){
    case 'defnotacommand':
        return function(cb){
            this.emit('error', 'error')
            return cb(8)
        }
    case 'echo':
        if(args instanceof Array){
            args = args.join(' ')
        }
        return mySpawn.simple(0,args)
    case 'node':
        return function(cb){
            var self = this
            this.stdout.ttyname = 'tty'+ttycount++
            this.stdin.destroy = function(){
                return cb(0)
            }
            this.stdout.write('>')
            this.stdin.on('data',function(s){
                if(s instanceof Buffer){
                    s = s.toString('utf8')
                }
                if(/^process.exit\(\)/.test(s)){
                    return cb(0)
                }
                var out = nodeRepl(s)
                self.stdout.write(out)
                self.stdout.write('>')
            })
        }
    case 'ls':
        if(args[0] === '-G'){
            return mySpawn.simple(0, '\u001b[33mHello\nWorld\u001b[0m')
        }
        break
    case 'bash':
        switch(args){
        case 'fixtures/test_exp_continue.sh':
        default:
            return function(cb){
                var self = this
                self.stdout.write('"Connecting" to a server:\n')
                self.stdout.write('user:')
                self.stdin.on('data', function(d){
                    d = (d.toString('utf8') || d).trim()
                    switch(d){
                    case 'foo':
                        return self.stdout.write('password:')
                    case 'bar':
                        return self.stdout.write('\n[foo@test-server]$ ')
                    case 'exit':
                        self.stdout.write('output\n')
                        self.stdout.write('exiting...')
                        return cb(0)
                    default:
                        return cb(1)
                    }
                })
            }
        }
        break
    default:
        return mySpawn.simple(0,'hello world')
    }
})

describe('spectcl', function(){

    it('should be an instance of Spectcl', function(){
        var session = new Spectcl()
        assert(session instanceof Spectcl)
    })
    it('should allow instantiation without new keyword', function(){
        /*eslint-disable new-cap*/
        var session = Spectcl()
        assert(session instanceof Spectcl)
        /*eslint-enable new-cap*/

    })
    it('should allow multiple spectcl instances to coexist', function(){
        var session1 = new Spectcl({maxMatch:5})
          , session2 = new Spectcl({maxMatch:6})
        assert(session1.options.maxMatch !== session2.options.maxMatch, 'Expected maxMatch to not match between instances')
    })

    describe('spawn', function(){
        it('should spawn a known command without emitting an error', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error: %s',err)
            })
            session.on('exit', function(){
                done()
            })
            session.spawn('ls')
        })

        it('should spawn with a command string', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error: %s',err)
            })
            session.on('exit', function(){
                done()
            })
            session.spawn('echo hello')
        })

        it('should spawn with a command string and args array', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error: %s', err)
            })
            session.on('exit', function(code){
                assert.equal(code, 0, 'non-0 return code')
                done()
            })
            session.spawn('echo', ['hello'])
        })

        it('should spawn without pty when `noPty` set to true', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error: '+err)
            })
            session.on('exit', function(code){
                assert.equal(0, code, 'child exited with non-0 return code')
                done()
            })
            session.spawn(['echo', 'hello'], {}, {noPty: true})
            assert.equal(session.child.ttyname, undefined, 'child was spawned with a pty session')
        })

        it('should spawn without cmdParams but with cmdOptions', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error: '+err)
            })
            session.on('exit', function(code){
                assert.equal(0, code, 'child exited with non-0 return code')
                done()
            })
            session.spawn(['echo', 'hello'], {})
            assert.equal(session.child.ttyname, undefined, 'child was spawned with a pty session')
        })

        it('should throw an error if command is not string or array', function(done){
            var session = new Spectcl()
            try{
                session.spawn({'echo': 'hello'}, {})
            } catch(e){
                assert(e)
                done()
            }
        })

        it('should spawn with ignoreCase and stripColors options', function(done){
            var session = new Spectcl({stripColors:true,ignoreCase:true})
            session.on('error', function(err){
                assert.fail('unexpected error: %s',err)
            })
            session.on('exit', function(){
                done()
            })
            session.spawn(['ls', '-G'])
        })

        it('should emit `error` event when command cannot be spawned', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.notEqual(null, err, 'recieved null error object')
                done()
            })
            session.spawn('defnotacommand')
        })

        it('should emit `error` event when command cannot be spawned with `noPty`', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.notEqual(null, err, 'recieved null error object')
                done()
            })
            session.spawn('defnotacommand', [], {}, {noPty:true})
        })

        it('should emit `exit` event when child exits', function(done){
            var session = new Spectcl()
            session.on('exit', function(code){
                assert.equal(code, 0, 'non-0 return code')
                done()
            })
            session.spawn('echo hello')
        })
    })

    describe('expect', function(){
        it('should expect and match on a String', function(done){
            var session = new Spectcl()
              , finished = _.after(2,done)
            session.spawn('echo hello')
            session.expect([
                'hello', function(match, matched, cb){
                    cb(null, 'hello', match, matched)
                }
            ], function(err, data, match, matched){
                assert.equal(err, null, 'unexpected err in final callback')
                assert.equal(data, 'hello', 'final callback was called by function other than expecation handler, data: "'+data+'"')
                assert.equal(match, matched, 'expected string equals matched string')
                finished()
            })
            session.on('exit', function(){
                finished()
            })
        })

        it('should ignore multiple callbacks for the same string', function(done){
            var session = new Spectcl()
              , finished = _.after(2,done)
            session.spawn('echo hello')
            session.expect([
                'hello', function(match, matched, cb){
                    cb(null, 'hello')
                },
                'hello', function(match, matched, cb){
                    assert(false)
                    cb(null, 'hello')
                }
            ], function(err, data, match, matched){
                assert.equal(err, null, 'unexpected err in final callback')
                assert.equal(data, 'hello', 'final callback was called by function other than expecation handler, data: "'+data+'"')
                assert.equal(match, matched, 'expected string equals matched string')
                finished()
            })
            session.on('exit', function(){
                finished()
            })
        })

        it('should expect and match on a RegExp', function(done){
            var session = new Spectcl()
              , finished = _.after(2,done)
            session.spawn('echo hello')
            session.expect([
                /hello/, function(match, matched, cb){
                    cb(null, 'hello', match, matched)
                }
            ], function(err, data, match, matched){
                assert.equal(err, null, 'unexpected err in final callback')
                assert.equal(data, 'hello', 'final callback was called by function other than expecation handler, data: "'+data+'"')
                assert.equal(match.toString().replace(/\//g,''), matched[0], 'expected regex equals matched string')
                finished()
            })
            session.on('exit', function(){
                finished()
            })
        })

        it('should match on content already in the session cache', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            // Wait until exit so that `hello` is for sure in the cache, and not read in as data
            session.child.on('exit',function(){
                session.expect([
                    'hello', function(match, matched, cb){
                        cb(null, 'hello')
                    }
                ], function(err, data){
                    assert.ifError(err)
                    assert.equal(data, 'hello')
                    done()
                })
            })
        })

        it('should populate expect_out object when match is found', function(done){
            var session = new Spectcl()
              , finished = _.after(2,done)
            session.spawn('node --interactive')
            session.expect([
                '>', function(){
                    assert.notEqual(session.expect_out.match, null, 'null expect_out match')
                    assert.notEqual(session.expect_out.buffer, '', 'empty expect_out buffer')
                    session.send('process.exit()\r')
                    finished()
                }
            ])
            session.on('exit', function(){
                finished()
            })
        })

        it('should emit error when given a non-String or non-RegExp parameter', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.notEqual(null, err, 'received null error object')
                done()
            })
            session.expect([
                1, function(){
                    assert.fail('unexpected match')
                }
            ])
        })

        it('should emit error when given non-function as expect callback', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.notEqual(null, err, 'received null error object')
                done()
            })
            session.expect([
                'foo', 'bar'
            ])

        })

        it('should emit error when given non-even expectations array', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.equal('cannot call expect with array that is odd in length', err.message, 'received unexpected error')
                done()
            })
            session.expect([
                'foo', function(){}, 'bar'
            ])
        })

        it('should emit error when given empty expectations array', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.equal('cannot call expect with empty array', err.message, 'received unexpected error')
                done()
            })
            session.expect([])
        })

        it('should emit error when calling expect() when already expecting', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.notEqual(null, err, 'received null error object')
                done()
            })
            session.expect([
                'foo', function(match){
                    assert.fail(match, 'error', 'should have thrown an error, not matched.')
                }
            ])
            session.expect([
                /foo/, function(match){
                    assert.fail(match, 'error', 'should have thrown an error, not matched.')
                }
            ])
        })

        it('should call the final callback after match handler has been called', function(done){
            var session = new Spectcl()
              , finished = _.after(2,done)
            session.on('error', function(err){
                assert.fail('unexpected error '+err)
            })
            session.spawn('echo hello')
            session.expect([
                /hello/, function(match, matched, cb){
                    cb(null, 'hello')
                }
            ], function(err, data){
                assert.ifError(err)
                assert.equal(data, 'hello')
                finished()
            })
            session.on('exit', function(){
                finished()
            })
        })

        it('should implement EXP_CONTINUE', function(done){
            var session = new Spectcl()
              , finished = _.after(2,done)
            session.spawn('bash',['fixtures/test_exp_continue.sh'],{cwd:__dirname})
            session.expect([
                /\$/, function(match, matched, cb){
                    session.send('exit\n')
                    cb(null, 'done')
                },
                /assword/, function(){
                    session.send('bar\n')
                    return session.EXP_CONTINUE
                },
                /user/, function(){
                    session.send('foo\n')
                    return session.EXP_CONTINUE
                }
            ], function(err, data){
                assert.equal(err, null, 'unexpected error in final callback')
                assert.equal(data, 'done')
                finished()
            })
            session.on('exit', function(){
                finished()
            })
        })

        it('should expect and match on TIMEOUT', function(done){
            var session = new Spectcl({timeout: 50})
              , finished = _.after(2,done)
            session.on('error', function(err){
                assert.fail('unexpected error '+err)
            })
            session.spawn('node --interactive')
            session.expect([
                'foo', function(){
                    session.send('process.exit()\r')
                    assert.fail('unexpected match')
                },
                session.TIMEOUT, function(match, matched, cb){
                    cb(new Error('timeout'))
                }
            ], function(err){
                assert.equal(err.message, 'timeout', 'received non-timeout error')
                session.send('process.exit()\r')
                finished()
            })
            session.on('exit', function(){
                finished()
            })
        })

        it('should call the final callback on TIMEOUT when no TIMEOUT expectation is specified', function(done){
            var session = new Spectcl({timeout: 50})
              , finished = _.after(2,done)
            session.on('error', function(err){
                assert.fail('unexpected error '+err)
            })
            session.spawn('node --interactive')
            session.expect([
                'foo', function(){
                    session.send('process.exit()\r')
                    assert.fail('unexpected match')
                }
            ], function(err){
                assert.ifError(err)
                session.send('process.exit()\r')
                finished()
            })
            session.on('exit', function(){
                finished()
            })
        })

        it('should expect and match on FULL_BUFFER', function(done){
            var session = new Spectcl({matchMax: 5})
              , finished = _.after(2,done)
            session.spawn('echo thequickbrownfoxjumpsoverthelazydog')
            session.expect([
                session.FULL_BUFFER, function(match, matched, cb){
                    cb(new Error('full buffer'))
                }
            ], function(err){
                assert(!!err)
                assert.equal(err.message, 'full buffer', 'unexpected error: '+err)
                finished()
            })
            session.on('exit', function(){
                finished()
            })
        })

        it('should expect and match on EOF', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error '+err)
            })
            session.spawn('echo hello')
            session.expect([
                session.EOF, function(match, matched, cb){
                    cb(new Error('eof'))
                }
            ], function(err){
                assert.equal(err.message, 'eof', 'received non-eof error in final callback')
                done()
            })
        })

        it('should expect and match on EOF when `noPty` enabled', function(done){
            var session = new Spectcl()
            session.on('error', function(err){
                assert.fail('unexpected error '+err)
            })
            session.spawn('echo', ['hello'], {}, {noPty: true})
            session.expect([
                session.EOF, function(match, matched, cb){
                    cb(new Error('eof'))
                }
            ], function(err){
                assert.equal(err.message, 'eof', 'received non-eof error in final callback')
                done()
            })
        })

        it('should call the final callback on EOF when no EOF expectation is specified', function(done){
            var session = new Spectcl()
            session.spawn('echo hello')
            session.expect([
                /goodbye/, function(){
                    assert.fail('unexpected match')
                }
            ], function(err){
                assert.ifError(err)
                done()
            })
        })
    })

    describe('send', function(){
        it('should call the cb once data has been written to child', function(done){
            var session = new Spectcl()
              , finished = _.after(2,done)
            session.spawn('node --interactive')
            session.expect([
                '>', function(){
                    assert.notEqual(session.expect_out.match, null, 'null expect_out match')
                    assert.notEqual(session.expect_out.buffer, '', 'empty expect_out buffer')
                    session.send('process.exit()\r', function(){
                        finished()
                    })
                    session.child.on('exit', function(){
                        finished()
                    })
                }
            ])
        })
    })

    describe('sendEof', function(){
        it('should kill the child process, emitting an exit event', function(done){
            var session = new Spectcl()
            session.spawn('node --interactive')
            session.expect([
                '>', function(){
                    session.on('exit', function(){
                        done()
                    })
                    session.sendEof()
                }
            ])
        })

        it('should call the callback when given one', function(done){
            var session = new Spectcl()
            session.spawn('node --interactive')
            session.expect([
                '>', function(){
                    session.sendEof(function(){
                        done()
                    })
                }
            ])
        })

        it('should kill the child process, emitting an exit event, when `noPty` enabled', function(done){
            var session = new Spectcl()
            session.on('exit', function(){
                done()
            })
            session.on('error', function(err){
                assert.fail('unexpected error: '+err)
            })
            session.spawn('node', ['--interactive'], {}, {noPty:true})
            session.expect([
                '>', function(){
                    session.sendEof()
                }
            ])
        })
    })
})
