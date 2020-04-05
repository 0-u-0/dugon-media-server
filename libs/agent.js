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
      // console.log(requestMsg);

      switch (method) {
        case 'transport': {
          const { transportId, role } = params;
          const transport = await this.hub.createTransport(transportId, role);

          this.response(replyTo, {
            transportParameters: transport.transportParameters
          });
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
        case 'produce': {
          const { transportId, kind, rtpParameters, metadata } = params;

          const publisher = this.hub.transports.get(transportId);
          if (publisher) {
            const producerId = await publisher.produce(kind, rtpParameters, metadata);
            this.response(replyTo, {
              producerId
            });
          }
          break;
        }
        case 'producers': {
          const { transportId } = params;
          const publisher = this.hub.transports.get(transportId);
          if (publisher) {
            const producers = [];
            for (let [producerId, producer] of publisher.producers) {
              producers.push({
                producerId,
                metadata: producer.appData
              })
            }
            this.response(replyTo, {
              producers
            });
          }
          break;
        }
        case 'consume': {
          const { transportId, producerId } = params;

          const subscriber = this.hub.transports.get(transportId);
          if (subscriber) {
            const consumerParameters = await subscriber.consume(producerId);
            this.response(replyTo, {
              consumerParameters
            });

          }

          break;
        }
        case 'closeProducer': {
          const { transportId, producerId } = params;

          const publisher = this.hub.transports.get(transportId);
          if (publisher) {
            publisher.closeProducer(producerId);
            this.response(replyTo);
          }

          break;
        }
        case 'unsubscribe': {
          const { transportId, producerId } = params;

          const subscriber = this.hub.transports.get(transportId);
          if (subscriber) {
            this.subscriber.unsubscribe(producerId);
            this.response(replyTo);
          }

          break;
        }
      }

    })
  }


}


module.exports = Agent;