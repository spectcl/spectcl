#!/usr/bin/env tclsh

# timeout.tcl: Simple example for expecting a timeout
#
# (C) 2015, Ryan Milbourne, ViaSat Inc.

package require Expect
log_user 0
set timeout 5
set ERROR ""

spawn node "--interactive"
expect {
    "foo" {
        puts "foo was echoed"
    }
    timeout {
        exp_send "exit\r"
        set ERROR "timeout"
    }
}
if { $ERROR ne ""} {
    puts "exp error: $ERROR"
}
