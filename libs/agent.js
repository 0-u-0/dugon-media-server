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

  mediaBroadcast(method, params = {}) {
    log.trace('mediaBroadcast ', method);
    this.nc.publish('media.@', JSON.stringify({
      method,
      params
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

    //FIXME(CC): use one subscribe(pipe) instead of 3 ?
    //for other media servers
    this.nc.subscribe(`media@pipeheartbeat`, async (requestMsg) => {
      const { id, name, host, area, salt } = JSON.parse(requestMsg);
      //TODO(CC): deal with area
      if (id !== this.id) {
        const ms = this.mediaServers.get(id);

        //create remtoe mediaserver and pipeline
        if (!ms) {
          let sameArea = true;
          if (area != this.area) {
            sameArea = false;
          }

          const pipe = await this.hub.createPipeTransport(sameArea);
          const mediaServer = new MediaServer(id, salt, pipe);

          mediaServer.onclose = _ => {
            // console.log(`${id} closed`);
            this.mediaServers.delete(id);
          };
          mediaServer.init();
          this.mediaServers.set(id, mediaServer);

          setTimeout(_ => {
            this.nc.publish(`media@pipeconnect.${id}`, JSON.stringify({
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

    //for other media servers
    this.nc.subscribe(`media@pipeconnect.${this.id}`, async (requestMsg, replyTo) => {
      const { id, ip, port, salt } = JSON.parse(requestMsg);

      // console.log(requestMsg, this.mediaServers.has(id));

      const ms = this.mediaServers.get(id);
      if (ms) {
        await ms.connect(ip, port);
      } else {
        //TODO(CC): impossible
      }

    })

    //for other media servers
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
      log.trace(requestMsg,replyTo);
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
          const { transportId, role } = params;
          // this.hub.close(transportId);
          const transport = this.hub.transports.get(transportId);
          if (transport) {
            if (role === 'pub') {
              const publisherIds = transport.publishers.keys();
              for (const publisherId of publisherIds) {
                this.mediaBroadcast('unpublish', {
                  transportId,
                  publisherId,
                  mediaId: this.id
                })
              }
            }

            transport.close();
            this.hub.transports.delete(transportId);
          }

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

          const sender = this.hub.transports.get(transportId);
          if (sender) {
            // TODO(cc): 10/17/24 rename
            const publisherId = await sender.publish(codec, metadata);
            this.response(replyTo, {
              publisherId
            });
          }
          break;
        }
        case 'pubs': {
          const { transportId } = params;
          const sender = this.hub.transports.get(transportId);
          if (sender) {
            const publishers = [];
            //TODO: map
            for (let [publisherId, publisher] of sender.publishers) {
              publishers.push({
                id: publisherId,
                metadata: publisher.metadata
              })
            }
            // TODO(cc): 10/17/24 rename
            this.response(replyTo, {
              publishers
            });
          }
          break;
        }
        case 'subscribe': {
          const { mediaId, transportId, publisherId } = params;

          if (mediaId === this.id) {
            //FIXME(CC): same
            const subscriber = this.hub.transports.get(transportId);
            if (subscriber) {
              const { codec, receiverId } = await subscriber.subscribe(publisherId);
              this.response(replyTo, {
                codec,
                receiverId
              });

            }

          } else {
            // console.log('other media server...');

            const mediaServer = this.mediaServers.get(mediaId);

            if (mediaServer) {
              if (mediaServer.pipeProducers.has(publisherId)) {
                //FIXME(CC): same
                const subscriber = this.hub.transports.get(transportId);
                if (subscriber) {
                  const { codec, receiverId } = await subscriber.subscribe(publisherId);
                  this.response(replyTo, {
                    codec,
                    receiverId
                  });
                }
              } else {
                //request pipe
                const requestMsg = JSON.stringify({
                  mediaId: this.id,
                  producerId: publisherId,
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
          const { transportId, publisherId } = params;

          const publisher = this.hub.transports.get(transportId);
          if (publisher) {
            publisher.unpublish(publisherId);
            this.response(replyTo);

            this.mediaBroadcast('unpublish', {
              transportId,
              publisherId,
              mediaId: this.id
            })
          }
          break;
        }
        case 'unsubscribe': {
          const { transportId, publisherId } = params;

          const subscriber = this.hub.transports.get(transportId);
          if (subscriber) {
            subscriber.unsubscribe(publisherId);
            this.response(replyTo);
          }

          break;
        }
        case 'resume': {
          const { transportId, publisherId, role } = params;

          const transport = this.hub.transports.get(transportId);
          if (transport) {
            await transport.resume(publisherId);

            if (role === 'pub') {
              this.mediaBroadcast('resume', {
                transportId,
                publisherId,
                mediaId: this.id
              });
            }
            this.response(replyTo);
          } else {
            //TODO: error
          }

          break;
        }
        case 'pause': {
          const { transportId, publisherId, role } = params;

          const transport = this.hub.transports.get(transportId);
          if (transport) {
            await transport.pause(publisherId)

            if (role === 'pub') {
              this.mediaBroadcast('pause', {
                transportId,
                publisherId,
                mediaId: this.id
              });
            }

            this.response(replyTo);
          } else {
            //TODO: error
          }

          break;
        }
      }

    });
    //for media server
    this.nc.subscribe(`media.@`, async (requestMsg) => {
      const { method, params } = JSON.parse(requestMsg);
      log.debug('media broadcast', requestMsg);
      switch (method) {
        case 'unpublish': {
          const { mediaId, transportId, publisherId } = params;
          const media = this.mediaServers.get(mediaId);
          if (media) {
            media.unproduce(publisherId);
          }
          break;
        }
        case 'resume': {
          const { mediaId, transportId, publisherId } = params;
          const media = this.mediaServers.get(mediaId);
          if (media) {
            media.resume(publisherId);
          }
          break;
        }
        case 'pause': {
          const { mediaId, transportId, publisherId } = params;
          const media = this.mediaServers.get(mediaId);
          if (media) {
            media.pause(publisherId);
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
      //TODO: add cpu usage,cpu threshold and bandwidth usage, bandwidth threshold 
      this.heartbeatTimer = setInterval(_ => {

        this.nc.publish(`media@heartbeat`, info)
      }, 1000);

    }, second * times)


  }


}


module.exports = Agent;