const sqlite3Process = require("./sqlite3Process.js")

const process = new sqlite3Process(Math.random().toString(36))

process.generate().then((res) => console.log(res))
