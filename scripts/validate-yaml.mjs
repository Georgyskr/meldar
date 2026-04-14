#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

const files = process.argv.slice(2)
if (files.length === 0) process.exit(0)

let failed = false
for (const file of files) {
	try {
		parse(readFileSync(file, 'utf8'))
	} catch (err) {
		console.error(`\x1b[31m✗ ${file}\x1b[0m`)
		console.error(`  ${err.message}`)
		failed = true
	}
}

if (failed) process.exit(1)
