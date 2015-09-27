#!/usr/bin/env tclsh

# node.tcl: Simple example for using Expect to interact with a session
#
# (C) 2015, Ryan Milbourne, ViaSat Inc.

package require Expect
log_user 0

spawn node "--interactive" 
expect {
    ">" {
        exp_send "console.log(\"testing\")\r"
        expect {
            ">" {
                exp_send "process.exit()\r"
                puts "output was:\n$expect_out(buffer)"
            }
        }
    }
}
