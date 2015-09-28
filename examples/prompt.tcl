#!/usr/bin/env tclsh

# wait.tcl: Simple example for working with an interactive prompting session.
#
# (C) 2015, Ryan Milbourne, ViaSat Inc.

package require Expect
log_user 0

spawn [file join [file normalize .. ] test fixtures prompt-and-respond ]
expect {
    first {
        exp_send "first-response\r"
        expect {
            second {
                exp_send "second-response\r"
                puts "two prompts were waited for and responded to"
            }
        }
    }
}
