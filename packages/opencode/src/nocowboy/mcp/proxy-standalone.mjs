#!/usr/bin/env node
import { spawn } from "node:child_process"
import { createInterface } from "node:readline"
import * as http from "node:http"

const port = Number(process.argv[2])
const cmd = process.argv.slice(3).join(" ")

if (!port || !cmd) {
  console.error("Usage: proxy-standalone.mjs <port> <command...>")
  process.exit(1)
}

function splitCmd(cmd) {
  const args = []
  let current = ""
  let inQuote = false
  for (const ch of cmd) {
    if (ch === "'" || ch === '"') { inQuote = !inQuote; continue }
    if (ch === " " && !inQuote) { if (current) { args.push(current); current = "" }; continue }
    current += ch
  }
  if (current) args.push(current)
  return args
}

const args = splitCmd(cmd)
const bin = args[0]
const binArgs = args.slice(1)

const proc = spawn(bin, binArgs, { stdio: ["pipe", "pipe", "inherit"] })
const rl = createInterface({ input: proc.stdout, crlfDelay: Infinity })
const pending = new Map()

let buf = ""
rl.on("line", (line) => {
  buf += line
  try {
    const msg = JSON.parse(buf)
    buf = ""
    const id = msg.id ?? msg.result?.id ?? msg.error?.id
    if (id !== undefined && pending.has(String(id))) {
      const p = pending.get(String(id))
      clearTimeout(p.timer)
      p.resolve(line)
      pending.delete(String(id))
    }
  } catch {}
})

function writeJSON(obj) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(obj)
    let msg
    try { msg = JSON.parse(body) } catch { reject(new Error("invalid JSON")); return }
    const id = String(msg.id ?? "")
    const timer = setTimeout(() => { pending.delete(id); reject(new Error("timeout")) }, 300_000)
    pending.set(id, { resolve, timer })
    proc.stdin.write(body + "\n")
  })
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/mcp") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    })
    res.write("data: connected\n\n")
    const keepAlive = setInterval(() => { res.write(": keepalive\n\n") }, 15_000)
    req.on("close", () => clearInterval(keepAlive))
    return
  }

  if (req.method === "POST" && req.url === "/mcp") {
    let body = ""
    req.on("data", (chunk) => { body += chunk })
    req.on("end", () => {
      let parsed
      try { parsed = JSON.parse(body) } catch {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }))
        return
      }
      writeJSON(parsed)
        .then((response) => {
          res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" })
          res.end(response)
        })
        .catch((err) => {
          res.writeHead(500, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: err.message }, id: parsed.id ?? null }))
        })
    })
    return
  }

  res.writeHead(404)
  res.end("Not found")
})

proc.on("exit", () => server.close())
proc.on("error", (err) => console.error("[mcp-proxy] child error:", err))

server.listen(port, "127.0.0.1", () => {
  console.error(`[mcp-proxy] listening on port ${port}`)
})
server.on("error", (err) => {
  console.error("[mcp-proxy] failed to listen:", err)
  process.exit(1)
})
