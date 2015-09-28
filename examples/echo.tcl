#!/usr/bin/env tclsh

# echo.tcl: Simple example for using `echo` command with Expect.
#
# (C) 2015, Ryan Milbourne, ViaSat Inc.

package require Expect
log_user 0

spawn echo hello
expect {
    "hello" {
        puts "hello was echoed"
    }
}
