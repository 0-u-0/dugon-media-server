const NATS = require('nats');

class Agent {
  constructor(hub) {
    this.hub = hub;
    this.nc = null;

  }

  response(replyTo, data = {}) {
    this.nc.publish(replyTo, JSON.stringify({
      type: 'response',
      data
    }));
  }

  errorResponse() {

  }

  init() {
    this.nc = NATS.connect();

    this.nc.subscribe('media@', async (requestMsg, replyTo) => {
      const { method, params } = JSON.parse(requestMsg);
      console.log(requestMsg);

      switch (method) {
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
          const { transportId, kind, rtpParameters, metadata } = params;

          const publisher = this.hub.transports.get(transportId);
          if (publisher) {
            const senderId = await publisher.publish(kind, rtpParameters, metadata);
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
            for (let [senderId, sender] of publisher.senders) {
              senders.push({
                senderId,
                metadata: sender.appData
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
            const parameters = await subscriber.subscribe(senderId);
            this.response(replyTo, {
              parameters
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