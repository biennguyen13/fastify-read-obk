const mysql = require("mysql2")
const fs = require("fs").promises
const fss = require("fs")
const path = require("path")
const bigInt = require("big-integer")

const sqlite3Process = require("./sqlite3Process.js")

;(async () => {
  const process = new sqlite3Process(Math.random().toString(36))
  const result = await process.generate()
  let currentCount = 0
  const stack = []

  if (result.success) {
    const connection = mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "root",
      database: "obk",
    })

    try {
      const files = await fs.readdir("output")

      for (const file of files) {
        const execute = () => {
          let resolve = null
          const filePath = path.join("output", file)

          fss.readFile(filePath, async (err, data) => {
            try {
              const jsonArray = JSON.parse(data).filter(({ vkey }) => vkey)
              const length = jsonArray.length
              let count = 0

              jsonArray.forEach(async ({ id, vkey, vmove, vhex }) => {
                connection.query(
                  "INSERT INTO bhobk2 SET ?",
                  {
                    id,
                    vkey: vhex ? bigInt(vhex.split("'")[1], 16).value : vkey,
                    vmove,
                  },
                  (error, results) => {
                    if (error) {
                      console.error(`Lỗi khi chèn dữ liệu: ${id}`, error)
                    }

                    ++currentCount
                    ++count

                    console.log(
                      `Dữ liệu đã được duyệt qua: id - ${id}, count: ${count}, length: ${length}, total: ${currentCount}, => ${(
                        (currentCount / process.recordNumber) *
                        100
                      ).toFixed(4)} %`
                    )

                    if (count >= length) {
                      resolve(count)
                    }
                  }
                )
              })
            } catch (parseError) {
              console.error("Lỗi khi phân tích dữ liệu JSON:", parseError)
            }
          })

          return new Promise((_) => {
            resolve = _
          })
        }

        stack.push(execute)
      }
    } catch (error) {
      console.error(`Lỗi: ${error.message}`)
    } finally {
      for (const _stack of stack) {
        const res = await _stack()
        console.log(
          "%csqlite3DataMigrate.js line:83 res",
          "color: #007acc;",
          res
        )
      }
    }
  }
})()
