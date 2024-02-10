#!/usr/bin/env just --justfile

alias b := build
alias c := check
alias t := test

@_default:
    just --list

@check:
    npm run tsc

@build:
    npm run build

@run:
    npm run run

@test:
    npm run test
