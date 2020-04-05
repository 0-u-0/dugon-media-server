const NATS = require('nats');
const Hub = require('./libs/hub');

async function main() {
  const hub = new Hub();
  await hub.init();

  const nc = NATS.connect();

  function response(replyTo, data = {}) {
    nc.publish(replyTo, JSON.stringify({
      type: 'response',
      data
    }));
  }

  function errorResponse() {

  }

  nc.subscribe('media@', async (requestMsg, replyTo) => {
    // console.log(request);
    const { method, params } = JSON.parse(requestMsg);

    console.log(requestMsg);

    switch (method) {
      case 'transport': {
        const { transportId, role } = params;
        const transport = await hub.createTransport(transportId, role);

        response(replyTo, {
          transportParameters: transport.transportParameters
        });
        break;
      }
      case 'dtls': {
        const { transportId, dtlsParameters } = params;

        const transport = hub.transports.get(transportId);
        if (transport) {
          await transport.setDtlsParameters(dtlsParameters)

          response(replyTo);
        } else {
          //TODO: error
        }
        break;
      }
      case 'produce': {
        const { transportId, kind, rtpParameters, metadata } = params;

        const publisher = hub.transports.get(transportId);
        if (publisher) {
          const producerId = await publisher.produce(kind, rtpParameters, metadata);
          response(replyTo, {
            producerId
          });
        }
        break;
      }
      case 'producers': {
        const { transportId } = params;
        const publisher = hub.transports.get(transportId);
        if (publisher) {
          const producers = [];
          for (let [producerId, producer] of publisher.producers) {
            producers.push({
              producerId,
              metadata: producer.appData
            })
          }
          response(replyTo, {
            producers
          });
        }
        break;
      }
      case 'consume': {
        const { transportId, producerId } = params;

        const subscriber = hub.transports.get(transportId);
        if (subscriber) {
          const consumerParameters = await subscriber.consume(producerId);
          response(replyTo, {
            consumerParameters
          });

        }

        break;
      }
      case 'closeProducer': {
        const { transportId, producerId } = params;

        const publisher = hub.transports.get(transportId);
        if (publisher) {
          publisher.closeProducer(producerId);
          response(replyTo);
        }

        break;
      }
      case 'unsubscribe': {
        const { transportId, producerId } = params;

        const subscriber = hub.transports.get(transportId);
        if (subscriber) {
          subscriber.unsubscribe(producerId);
          response(replyTo);
        }

        break;
      }
    }

  })




}


main();