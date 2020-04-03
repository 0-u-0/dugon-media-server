const mediasoup = require('mediasoup');

const Publisher = require('./publisher');
const Subscriber = require('./subscriber');

const mediaCodecs = [{
  kind: 'audio',
  mimeType: 'audio/opus',
  clockRate: 48000,
  channels: 2
},
{
  kind: 'video',
  mimeType: 'video/VP8',
  clockRate: 90000,
  parameters:
  {
    'x-google-start-bitrate': 1000
  }
}];

class Hub {
  constructor() {
    this.worker = null;
    this.router = null;

    this.transports = new Map();
  }

  async init() {
    this.worker = await mediasoup.createWorker(
      {
        logLevel: 'warn',
        logTags: [
          'info',
          'ice',
          'dtls',
          'rtp',
          'srtp',
          'rtcp',
          'rtx',
          'bwe',
          'score',
          'simulcast',
          'svc',
          'sctp'
        ],
        rtcMinPort: 40000,
        rtcMaxPort: 49999
      });

    this.worker.on('died', () => {
      console.log('mediasoup Worker died, exiting  in 2 seconds... [pid:%d]', this.worker.pid);

      setTimeout(() => process.exit(1), 2000);
    });

    this.router = await this.worker.createRouter({ mediaCodecs });

  }

  async createTransport(id, role) {
    let transport = null;
    if (role === 'pub') {
      transport = new Publisher(id, this.router);
    } else {
      transport = new Subscriber(id, this.router);
    }
    await transport.init();
    this.transports.set(id, transport);
    return transport;
  }

}


module.exports = Hub;