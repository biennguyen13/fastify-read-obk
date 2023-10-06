"use strict"
const sqlite3 = require("sqlite3")
const path = require("path")
const AutoLoad = require("@fastify/autoload")
const fs = require("fs")
const bigInt = require("big-integer")

const fastifyMySQL = require("@fastify/mysql")

const connectionConfig = {
  host: "127.0.0.1:3306", // Thay đổi thành host MySQL của bạn
  user: "root", // Thay đổi thành tên người dùng MySQL của bạn
  password: "root", // Thay đổi thành mật khẩu MySQL của bạn
  database: "obk", // Thay đổi thành tên cơ sở dữ liệu MySQL của bạn
}
const connectionString = `mysql://${connectionConfig.user}:${connectionConfig.password}@${connectionConfig.host}/${connectionConfig.database}`
// Đối tượng cấu hình cho kết nối MySQL
const mysqlConfig = {
  // Đối tượng cấu hình cho kết nối MySQL
  client: "mysql2",
  connection: {
    host: "127.0.0.1:3306", // Thay đổi thành host MySQL của bạn
    user: "root", // Thay đổi thành tên người dùng MySQL của bạn
    password: "root", // Thay đổi thành mật khẩu MySQL của bạn
    database: "obk", // Thay đổi thành tên cơ sở dữ liệu MySQL của bạn
  },
}

// Pass --options via CLI arguments in command to enable these options.
module.exports.options = {}

module.exports = async function (fastify, opts) {
  const db = new sqlite3.Database("BHHH.obk", (err) => {
    if (err) {
      console.error("Error opening database:", err)
    } else {
      console.log("Connected to SQLite database")
    }
  })
  fastify.decorate("db", db) // Thêm kết nối cơ sở dữ liệu vào Fastify
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "plugins"),
    options: Object.assign({}, opts),
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, "routes"),
    options: Object.assign({}, opts),
  })

  fastify.get("/api/users", (request, reply) => {
    fastify.db.all(
      " SELECT ieee754_from_blob(x'BD6963A1DFE8014C') as F",
      // "SELECT * FROM bhobk WHERE vkey like '-2.96158888941011e-144'",
      (err, rows) => {
        if (err) {
          console.error("Error executing query:", err)
          reply.status(500).send({ error: "Internal Server Error" })
        } else {
          reply.send(rows)
        }
      }
    )
  })

  // mysql
  fastify.register(require("@fastify/mysql"), {
    connectionString,
  })

  setTimeout(() => {
    fastify.mysql.getConnection(onConnect)

    function onConnect(err, client) {
      fs.readFile("./output-json.json", "utf8", async (err, data) => {
        if (err) {
          console.error("Đã xảy ra lỗi khi đọc file:", err)
          return
        }

        try {
          const jsonArray = JSON.parse(data)
          jsonArray.forEach(async (obj, index) => {
            // console.log(obj.id, obj.vkey.toString())
            client.query(
              `INSERT INTO bhobk (id, vkey, vmove) VALUES (?, ?, ?)`,
              [
                obj.id,
                obj.vkey?.includes(".")
                  ? bigInt(obj.vhex.split("'")[1], 16).value
                  : obj.vkey,
                obj.vmove,
              ],
              function onResult(err, result) {
                console.log(obj.id, obj.vkey?.toString())
                if (!err) {
                  console.log(`Record: #${index + 1}:`, "inserted")
                }
              }
            )
          })
        } catch (parseError) {
          console.error("Lỗi khi phân tích dữ liệu JSON:", parseError)
        }
      })

      client.release()
    }
  }, 3000)
}
