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
},
{
  kind: 'video',
  mimeType: 'video/VP9',
  clockRate: 90000,
  parameters:
  {
    'profile-id': 2,
  }
},
{
  kind: 'video',
  mimeType: 'video/h264',
  clockRate: 90000,
  parameters:
  {
    'packetization-mode': 1,
    'profile-level-id': '4d0032',
    'level-asymmetry-allowed': 1
  }
},
{
  kind: 'video',
  mimeType: 'video/h264',
  clockRate: 90000,
  parameters:
  {
    'packetization-mode': 1,
    'profile-level-id': '42e01f',
    'level-asymmetry-allowed': 1
  }
}];

class Hub {
  constructor(ip, publicIp, port) {
    this.ip = ip;
    this.publicIp = publicIp;

    this.worker = null;
    this.router = null;

    this.port = port;

    this.transports = new Map();

    this.codecsSupported = null;
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
        rtcMinPort: this.port.min,
        rtcMaxPort: this.port.max
      });

    this.worker.on('died', () => {
      console.log('mediasoup Worker died, exiting  in 2 seconds... [pid:%d]', this.worker.pid);

      setTimeout(() => process.exit(1), 2000);
    });

    this.router = await this.worker.createRouter({ mediaCodecs });
  }

  get codecs() {
    if (this.router && !this.codecsSupported) {
      let originCap = this.router.rtpCapabilities;
      let { codecs, headerExtensions } = JSON.parse(JSON.stringify(originCap));

      for (let extension of headerExtensions) {

        if (extension.direction.includes('send')) {
          extension.send = true;
        }
        if (extension.direction.includes('recv')) {
          extension.recv = true;
        }
        //FIXME: maybe useful?
        delete extension.direction;
        delete extension.preferredEncrypt;
      }

      let codecMap = {};
      for (let codec of codecs) {
        let realCodec = codec.mimeType.split('/')[1];
        //TODO: rtx
        if (realCodec != 'rtx') {
          if (realCodec === 'H264') {
            /**
            const H264_BASELINE = '42001f';
            const H264_CONSTRAINED_BASELINE = '42e01f'
            const H264_MAIN = '4d0032'
            const H264_HIGH = '640032'
             */
            if (codec.parameters['profile-level-id'] == '42001f') {
              realCodec = realCodec + '-BASELINE';
            } else if (codec.parameters['profile-level-id'] == '42e01f') {
              realCodec = realCodec + '-CONSTRAINED-BASELINE';
            } else if (codec.parameters['profile-level-id'] == '4d0032') {
              realCodec = realCodec + '-MAIN';
            } else if (codec.parameters['profile-level-id'] == '640032') {
              realCodec = realCodec + '-HIGH';
            }
          }

          let newParameters = [];
          for (let key in codec.parameters) {
            newParameters.push(`${key}=${codec.parameters[key]}`);
          }
          codec.parameters = newParameters;

          codec.codecName = realCodec;

          codec.ext = [];
          for (let extension of headerExtensions) {
            if (codec.kind == extension.kind) {
              codec.ext.push(extension)
            }
          }
          codecMap[realCodec] = codec;
        }
      }
      this.codecsSupported = codecMap;
    }
    return this.codecsSupported;
  }

  async createTransport(id, role) {
    let transport = null;
    if (role === 'pub') {
      transport = new Publisher(id, this.router);
    } else {
      transport = new Subscriber(id, this.router);
    }
    await transport.init(this.ip, this.publicIp);
    this.transports.set(id, transport);
    return transport;
  }

  close(transportId) {
    const transport = this.transports.get(transportId);
    if (transport) {
      transport.close();
      this.transports.delete(transportId);
    }
  }

}


module.exports = Hub;