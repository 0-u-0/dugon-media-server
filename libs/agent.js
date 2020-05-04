const NATS = require('nats');

class Agent {
  constructor(hub) {
    this.hub = hub;
    this.nc = null;
  }

  response(replyTo, data = {}) {
    console.log('response', data);
    this.nc.publish(replyTo, JSON.stringify({
      method: 'response',
      data
    }));
  }

  errorResponse() {

  }

  init(natsUrls) {

    this.nc = NATS.connect({ servers: natsUrls });

    this.nc.subscribe('media@', async (requestMsg, replyTo) => {
      const { method, params } = JSON.parse(requestMsg);
      console.log(requestMsg);

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
          const { transportId, senderId } = params;

          const subscriber = this.hub.transports.get(transportId);
          if (subscriber) {
            const { codec, receiverId } = await subscriber.subscribe(senderId);
            this.response(replyTo, {
              codec,
              receiverId
            });

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
  }


}


module.exports = Agent;