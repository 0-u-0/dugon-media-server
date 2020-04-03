const Transport = require('./transport');

class Publisher extends Transport {
  constructor(id, router) {
    super(id, router);
    this.producers = new Map();
  }

  async init() {
    await super.init(true);
  }

  async produce(kind, rtpParameters, appData) {
    const producer = await this.transport.produce({ kind, rtpParameters, appData });
    this.producers.set(producer.id, producer);
    return producer.id;
  }

  closeProducer(producerId) {
    const producer = this.producers.get(producerId);
    if (producer) {
      producer.close();
      this.producers.delete(producerId);
    }
  }

}

module.exports = Publisher;