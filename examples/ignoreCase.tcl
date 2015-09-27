#!/usr/bin/env tclsh

# ignoreCase.tcl: Simple example showing nocase in TCL Expect
#
# (C) 2015, Ryan Milbourne, ViaSat Inc.

package require Expect
log_user 0

spawn echo hElLo
expect {
    -nocase "hello" {
        puts "hello was echoed"
    }
}
