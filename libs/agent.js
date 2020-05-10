const NATS = require('nats');
const MediaServer = require('./mediaserver');
const utils = require('./utils');

const logger = require('./logger').logger;
const log = logger.getLogger('agent');

class Agent {
  constructor(hub) {
    this.id = '?';
    this.name = '?';
    this.area = '?';
    this.host = '?';

    this.salt = utils.randomId(8);

    this.hub = hub;
    this.nc = null;

    this.heartbeatTimer = null;

    this.mediaServers = new Map();
  }

  response(replyTo, data = {}) {
    log.trace('response to signal -> ', JSON.stringify(data));
    this.nc.publish(replyTo, JSON.stringify({
      method: 'response',
      data
    }));
  }

  errorResponse() {

  }

  init(natsUrls, id, name, host, area) {
    this.id = id;
    this.name = name;
    this.host = host;
    this.area = area;

    this.nc = NATS.connect({ servers: natsUrls });

    this.nc.subscribe(`media@pipeheartbeat`, async (requestMsg) => {
      const { id, name, host, area, salt } = JSON.parse(requestMsg);
      //TODO(CC): deal with area
      if (id !== this.id) {
        const ms = this.mediaServers.get(id);
        if (!ms) {
          // console.log('register mediaserver');

          const pipe = await this.hub.createPipeTransport();
          const mediaServer = new MediaServer(id, salt, pipe);

          mediaServer.onclose = _ => {
            // console.log(`${id} closed`);
            this.mediaServers.delete(id);
          };
          mediaServer.init();
          this.mediaServers.set(id, mediaServer);

          setTimeout(_ => {
            this.nc.publish(`media@pipe.${id}`, JSON.stringify({
              ip: mediaServer.tuple.ip,
              port: mediaServer.tuple.port,
              id: this.id,
              salt,
            }))
          }, 1500);

        } else {
          if (ms.salt == salt) {
            ms.isActive = true;
          } else {
            ms.close();
            this.mediaServers.delete(id);
          }
        }
      }

    });

    this.nc.subscribe(`media@pipe.${this.id}`, async (requestMsg, replyTo) => {
      const { id, ip, port, salt } = JSON.parse(requestMsg);

      // console.log(requestMsg, this.mediaServers.has(id));

      const ms = this.mediaServers.get(id);
      if (ms) {
        await ms.connect(ip, port);
      } else {
        //TODO(CC): impossible
      }

    })

    this.nc.subscribe(`media@pipesub.${this.id}`, async (requestMsg, replyTo) => {
      const { mediaId, producerId } = JSON.parse(requestMsg);
      const media = this.mediaServers.get(mediaId);
      if (media) {
        const params = await media.consume(producerId);
        if (params) {
          // console.log("pipeconsume");
          // console.log(rtpParameters);
          this.nc.publish(replyTo, JSON.stringify({
            rtpParameters: params.rtpParameters,
            kind: params.kind,
            producerId,
          }));
        } else {
          //TODO(CC): error
        }
      } else {
        //TODO(CC): error
      }
    });
    //for signal
    this.nc.subscribe(`media.${id}`, async (requestMsg, replyTo) => {
      const { method, params } = JSON.parse(requestMsg);
      // console.log(requestMsg);

      switch (method) {
        case 'codecs': {
          this.response(replyTo, {
            codecs: this.hub.codecs
          });
          break;
        }
        case 'transport': {
          const { transportId, role } = params;
          const transport = await this.hub.createTransport(transportId, role);

          this.response(replyTo, {
            transportParameters: transport.transportParameters
          });
          break;
        }
        case 'close': {
          const { transportId } = params;
          this.hub.close(transportId);
          this.response(replyTo);
          break;
        }
        case 'dtls': {
          const { transportId, dtlsParameters } = params;

          const transport = this.hub.transports.get(transportId);
          if (transport) {
            await transport.setDtlsParameters(dtlsParameters)

            this.response(replyTo);
          } else {
            //TODO: error
          }
          break;
        }
        case 'publish': {
          const { transportId, codec, metadata } = params;

          const publisher = this.hub.transports.get(transportId);
          if (publisher) {
            const senderId = await publisher.publish(codec, metadata);
            this.response(replyTo, {
              senderId
            });
          }
          break;
        }
        case 'senders': {
          const { transportId } = params;
          const publisher = this.hub.transports.get(transportId);
          if (publisher) {
            const senders = [];
            //TODO: map
            for (let [senderId, sender] of publisher.senders) {
              senders.push({
                id: senderId,
                metadata: sender.metadata
              })
            }
            this.response(replyTo, {
              senders
            });
          }
          break;
        }
        case 'subscribe': {
          const { mediaId, transportId, senderId } = params;

          if (mediaId === this.id) {
            //FIXME(CC): same
            const subscriber = this.hub.transports.get(transportId);
            if (subscriber) {
              const { codec, receiverId } = await subscriber.subscribe(senderId);
              this.response(replyTo, {
                codec,
                receiverId
              });

            }

          } else {
            // console.log('other media server...');

            const mediaServer = this.mediaServers.get(mediaId);

            if (mediaServer) {
              if (mediaServer.pipeProducers.has(senderId)) {
                //FIXME(CC): same
                const subscriber = this.hub.transports.get(transportId);
                if (subscriber) {
                  const { codec, receiverId } = await subscriber.subscribe(senderId);
                  this.response(replyTo, {
                    codec,
                    receiverId
                  });
                }
              } else {
                //request pipe
                const requestMsg = JSON.stringify({
                  mediaId: this.id,
                  producerId: senderId,
                });

                this.nc.request(`media@pipesub.${mediaId}`, requestMsg, async (responseMsg) => {
                  const { producerId, rtpParameters, kind } = JSON.parse(responseMsg);
                  //FIXME(CC): same
                  await mediaServer.produce(producerId, kind, rtpParameters);
                  const subscriber = this.hub.transports.get(transportId);
                  if (subscriber) {
                    const { codec, receiverId } = await subscriber.subscribe(producerId);
                    this.response(replyTo, {
                      codec,
                      receiverId
                    });
                  }
                })
              }
            } else {
              //TODO(CC): error
            }

          }

          break;
        }
        case 'unpublish': {
          const { transportId, senderId } = params;

          const publisher = this.hub.transports.get(transportId);
          if (publisher) {
            publisher.unpublish(senderId);
            this.response(replyTo);
          }
          break;
        }
        case 'unsubscribe': {
          const { transportId, senderId } = params;

          const subscriber = this.hub.transports.get(transportId);
          if (subscriber) {
            subscriber.unsubscribe(senderId);
            this.response(replyTo);
          }

          break;
        }
        case 'resume': {
          const { transportId, senderId } = params;

          const transport = this.hub.transports.get(transportId);
          if (transport) {
            await transport.resume(senderId)
            this.response(replyTo);
          } else {
            //TODO: error
          }

          break;
        }
        case 'pause': {
          const { transportId, senderId } = params;

          const transport = this.hub.transports.get(transportId);
          if (transport) {
            await transport.pause(senderId)
            this.response(replyTo);
          } else {
            //TODO: error
          }

          break;
        }
      }

    })

    const times = 5;
    const second = 1000;
    const info = JSON.stringify({
      id: this.id,
      name: this.name,
      host: this.host,
      area: this.area,
      salt: this.salt,
    })

    const registerTimer = setInterval(_ => {
      this.nc.publish(`media@pipeheartbeat`, info);
    }, second);

    const registerReleaseTimer = setTimeout(_ => {
      //TODO: release
      //TODO: add cpu and bandwidth usage

      this.heartbeatTimer = setInterval(_ => {

        this.nc.publish(`media@heartbeat`, info)
      }, 1000);

    }, second * times)


  }


}


module.exports = Agent;