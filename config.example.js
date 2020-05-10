module.exports = {
  debug: true,
  id: "foo",
  area: "jp",
  host: "tokyo1",
  name: "test",
  nats: ['nats://127.0.0.1:4222'],
  ip: '127.0.0.1',
  publicIp: '127.0.0.1',
  port: {
    min: 40000,
    max: 49999
  },
  monitor: 0,
  log: {
    'trace': [],
    'debug': [],
    'info': ['main'],
    'warn': [],
    'error': [],
  },
};