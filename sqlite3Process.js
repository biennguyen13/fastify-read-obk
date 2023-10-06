const { exec } = require("child_process")
const fs = require("fs").promises
const path = require("path")

async function createDirectoryIfNotExists(directoryName) {
  try {
    await fs.access(directoryName) // Kiểm tra sự tồn tại của thư mục
    console.log(`Thư mục ${directoryName} đã tồn tại.`)
  } catch (err) {
    if (err.code === "ENOENT") {
      // Thư mục không tồn tại, thực hiện tạo thư mục
      try {
        await fs.mkdir(directoryName)
        console.log(`Thư mục ${directoryName} đã được tạo.`)
      } catch (mkdirErr) {
        console.error(`Lỗi khi tạo thư mục ${directoryName}: ${mkdirErr}`)
      }
    } else {
      console.error(`Lỗi khi kiểm tra thư mục ${directoryName}: ${err}`)
    }
  }
}

async function deleteFilesInDirectory(directoryPath) {
  try {
    const files = await fs.readdir(directoryPath)

    for (const file of files) {
      const filePath = path.join(directoryPath, file)
      await fs.unlink(filePath)
      console.log(`Đã xóa tệp: ${filePath}`)
    }

    console.log(`Đã xóa hết tệp trong thư mục: ${directoryPath}`)
  } catch (error) {
    console.error(`Lỗi: ${error.message}`)
  }
}

module.exports = class Sqlite3Process {
  constructor(id, file = "BHHH.obk") {
    this.id = "--== Sqlite3Process " + id + " ==--"
    this.sqlite3Process = exec("sqlite3.exe")
    this.resolve = null
    this.recordNumber = 0
    this.promiseReady = null
    this.numberInFile = 100000
    this.folderName = "output"
    this.start()
  }

  start() {
    this.sqlite3Process.stdin.write(`.open BHHH.obk\n`)

    this.sqlite3Process.on("exit", () => {
      console.log("Process exited.")
      // this.kill()
      this.resolve({
        success: true,
        message: "Đã hoàn thành export file obk sang file JSON.",
      })
    })
    this.sqlite3Process.stdin.on("close", () => {
      console.log("Process stdin closed.")
    })

    this.sqlite3Process.stdout.on("data", (data) => {
      data = data.split("|")
      const type = data[0]

      if (type === "count") {
        this.recordNumber = parseInt(data[1])
        this.promiseReady(this.recordNumber)
        this.promiseReady = null
      }
    })
  }

  async waitingReady() {
    this.sqlite3Process.stdin.write(
      `SELECT 'count' AS TYPE, COUNT(*) AS COUNT FROM bhobk WHERE vkey IS NOT NULL;\n`
    )

    await new Promise((resolve) => {
      if (this.recordNumber) {
        resolve(this.recordNumber)
      } else {
        this.promiseReady = resolve
      }
    })
  }

  async generateJson(offset = 0, book_name = "book") {
    const query = `
    SELECT id, CAST(vkey AS TEXT) AS vkey, vmove,
      CASE
        WHEN vkey LIKE '%.%' THEN quote(ieee754_to_blob(vkey))
        ELSE NULL
      END AS vhex
    FROM bhobk
    WHERE vkey IS NOT NULL
    ORDER BY id ASC 
    LIMIT ${this.numberInFile} 
    OFFSET ${offset};
    `

    this.sqlite3Process.stdin.write(
      `.output ${this.folderName}/${book_name}.json\n`
    )
    this.sqlite3Process.stdin.write(query + "\n")
  }

  async generate(file_name = "book") {
    createDirectoryIfNotExists(this.folderName)

    await deleteFilesInDirectory(this.folderName)

    await this.waitingReady()

    this.sqlite3Process.stdin.write(`.mode json\n`)

    let offset = 0
    while (offset < this.recordNumber) {
      this.generateJson(
        offset,
        `book_name_${offset + 1}_${offset + this.numberInFile}`
      )
      offset += this.numberInFile
    }

    this.end()

    return new Promise((resolve) => {
      this.resolve = resolve
    })
  }

  end() {
    this.sqlite3Process.stdin.end()
  }

  kill() {
    this.sqlite3Process.kill()
  }
}
