const Transport = require('./transport');
const Sender = require('./sender');

class Publisher extends Transport {
  constructor(id, router) {
    super(id, router);
    this.senders = new Map();
  }

  async init() {
    await super.init(true);
  }

  async publish(kind, rtpParameters, appData) {
    const sender = new Sender(this, kind, rtpParameters, appData);
    await sender.init();
    this.senders.set(sender.id, sender);
    return sender.id;
  }

  unpublish(senderId) {
    const sender = this.senders.get(senderId);
    if (sender) {
      sender.close();
      this.senders.delete(senderId);
    }
  }


}

module.exports = Publisher;