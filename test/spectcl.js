var assert = require('assert')
  , sinon = require('sinon')
  , spectcl = require('../lib/spectcl')

describe('spectcl', function(){
    describe('spawn', function(){
        it('should spawn a known command without emitting an error', function(done){
            var session = new spectcl()
            var eventSpy = sinon.spy()
            setTimeout(function(){
                assert.equal(eventSpy.called, false, 'unexpected error event fired')
                done()
            }, 1500)
            session.on('error', eventSpy)
            session.spawn('bash')
        })

        it('should spawn with a command string', function(done){
            var session = new spectcl()
            var eventSpy = sinon.spy()
            setTimeout(function(){
                assert.equal(eventSpy.called, false, 'unexpected error event fired')
                done()
            }, 1500)
            session.on('error', eventSpy)
            session.spawn('echo hello')
        })

        it('should spawn with a command string and args array', function(done){
            var session = new spectcl()
            var eventSpy = sinon.spy()
            setTimeout(function(){
                assert.equal(eventSpy.called, false, 'unexpected error event fired')
                done()
            }, 1500)
            session.on('error', eventSpy)
            session.spawn('echo', ['hello'])
        })

        it('should rx error message from child when command cannot be spawned', function(done){
            var session = new spectcl()
            session.on('error', function(){
                assert.fail('','','unexpected error event fired')
            })
            session.spawn('defnotacommand')
            session.expect([
                'No such file or directory', function(){
                    done()
                }
            ])
        })

        it('should emit `close` event when child closes', function(done){
            var session = new spectcl()
            session.on('close', function(){
                done()
            })
            session.spawn('echo hello')
        })

        it('should emit `data` event when child session sends data', function(done){
            var session = new spectcl()
            session.on('data', function(data){
                assert.equal(data, 'hello\n')
                done()
            })
            session.spawn('echo hello')
        })
    })

    describe('expect', function(){
        it('should expect a String', function(done){
            var session = new spectcl()
            session.spawn('echo hello')
            session.expect([
                'hello', function(){
                    done();
                }
            ])
        })

        it('should expect a RegExp', function(done){
            var session = new spectcl()
            session.spawn('echo hello')
            session.expect([
                /hello/, function(){
                    done();
                }
            ])
        })

        it('should emit error when given a non-String or non-RegExp parameter', function(done){
            var session = new spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.notEqual(null, err, 'received null error object')
                done()
            })
            session.expect([
                1, function(){
                }
            ])
        })

        it('should emit error when given non-function as expect callback', function(done){
            var session = new spectcl()
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
            var session = new spectcl()
            session.spawn('echo hello')
            session.on('error', function(err){
                assert.equal('cannot call expect with array that is odd in length', err.message, 'received unexpected error')
                done()
            })
            session.expect([
                'foo', function(){return}, 'bar'
            ])
        })

        it('should emit error when calling expect() when already expecting', function(done){
            var session = new spectcl()
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
                /foo/, function(){
                    assert.fail(match, 'error', 'should have thrown an error, not matched.')
                }
            ])
        })

        it('should match on content already in the session cache', function(done){
            var session = new spectcl()
            session.spawn('echo hello')
            //Wait so that `hello` is for sure in the cache, and not read in as data
            setTimeout(function(){
                session.expect([
                    /hello/, function(){
                        done()
                    }
                ])
            }, 1000)
        })

        it('should implement EXP_CONTINUE', function(done){
            var session = new spectcl()
            session.spawn('bash '+__dirname+'/fixtures/test_exp_continue.sh')
            session.expect([
                /\$/, function(){
                    session.send('exit\n')
                    session.expect([
                        'exiting...', function(){
                            assert.equal(session.expect_out.buffer, ' output\nexiting...')
                            done()
                        }
                    ])
                },
                /assword/, function(){
                    session.send('bar\n')
                    return session.EXP_CONTINUE
                },
                /user/, function(){
                    session.send('foo\n')
                    return session.EXP_CONTINUE
                }
            ])
        })
    })

    describe('sendEof', function(){
        it('should kill the child process, emitting a close event', function(done){
            var session = new spectcl()
            session.on('close', function(code, signal){
                done()
            })
            session.spawn('node --interactive')
            session.expect([
                '>', function(){
                    session.sendEof()
                }
            ])
        })
    })
})
