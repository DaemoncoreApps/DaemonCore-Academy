import http from 'node:http'

const accounts = {
  'vx-104': { account: 'VX-104', tenant: 'EMBER', owner: 'training-operator', balance: 4100 },
  'vx-207': { account: 'VX-207', tenant: 'OBSIDIAN', owner: 'synthetic-peer', balance: 7250 },
}

http.createServer((request, response) => {
  response.setHeader('content-type', 'application/json')
  response.setHeader('x-daemoncore-target', 'synthetic-bola-lab')
  if (request.url === '/health') {
    response.end(JSON.stringify({ status: 'healthy' }))
    return
  }
  if (request.url === '/flow') {
    response.end(JSON.stringify({ flow: ['bearer token accepted', 'account query selected', 'record returned'], operatorAccount: 'VX-104', testBoundary: 'VX-207' }, null, 2))
    return
  }
  if (!request.url.startsWith('/export?')) {
    response.writeHead(404)
    response.end(JSON.stringify({ error: 'not found' }))
    return
  }
  if (request.headers.authorization !== 'Bearer dc-student-token') {
    response.writeHead(401)
    response.end(JSON.stringify({ error: 'valid synthetic bearer token required' }))
    return
  }
  const account = new URL(request.url, 'http://portal-target').searchParams.get('account')?.toLowerCase()
  const record = accounts[account]
  if (!record) {
    response.writeHead(404)
    response.end(JSON.stringify({ error: 'synthetic account not found' }))
    return
  }
  response.end(JSON.stringify({ authenticatedAs: 'training-operator', ...record }, null, 2))
}).listen(8080, '0.0.0.0')

console.log('DaemonCore synthetic authorization target online')
