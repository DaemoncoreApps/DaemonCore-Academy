import http from 'node:http'
import net from 'node:net'

const bind = '0.0.0.0'
let capacityWindow = Date.now()
let requestsInWindow = 0

function pressureSignal() {
  const now = Date.now()
  if (now - capacityWindow >= 1000) {
    capacityWindow = now
    requestsInWindow = 0
  }
  requestsInWindow += 1
  if (requestsInWindow > 300) return { status: 503, delayMs: 180, state: 'saturated' }
  if (requestsInWindow > 120) return { status: 200, delayMs: Math.min(900, 20 + (requestsInWindow - 120) * 4), state: 'degraded' }
  return { status: 200, delayMs: 0, state: 'nominal' }
}

net.createServer(socket => {
  socket.end('SSH-2.0-OpenSSH_9.3 DaemonCore_Training\r\n')
}).listen(22, bind)

net.createServer(socket => {
  socket.end('SMB_SYNTHETIC_BANNER // SAMBA 4.18 // DC-LAB\r\n')
}).listen(445, bind)

http.createServer((request, response) => {
  response.setHeader('Server', 'Archive Console/0.8-training')
  if (request.url === '/health') {
    const signal = pressureSignal()
    setTimeout(() => {
      response.writeHead(signal.status, { 'content-type': 'text/plain', 'x-daemoncore-capacity': signal.state, ...(signal.status === 503 ? { 'retry-after': '1' } : {}) })
      response.end(signal.status === 503 ? 'capacity exhausted' : 'healthy')
    }, signal.delayMs)
    return
  }
  if (request.url === '/status') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({
      service: 'Archive Console',
      version: '0.8-training',
      authentication: false,
      classification: 'synthetic-lab-target',
      message: 'Undocumented status listener is reachable.',
    }, null, 2))
    return
  }
  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ error: 'not found' }))
}).listen(8088, bind)

console.log('DaemonCore synthetic archive target online')
