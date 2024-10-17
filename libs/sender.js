const Transport = require('./transport');
const Publisher = require('./publisher');

const logger = require('./logger').logger;
const log = logger.getLogger('sender');

class MySender extends Transport {
  constructor(id, router) {
    super(id, router);
    this.senders = new Map();
    this.role = 'pub';
  }

  async publish(codec, metadata) {
    // TODO(cc): 10/17/24 rename sender
    const sender = new Publisher(this, codec, metadata);

    sender.ontransportclose = _ => {
      this.senders.delete(sender.id);
      log.debug(`senderId ${sender.id} sender'transport closed.`);
    };

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

  async pause(senderId) {
    const sender = this.senders.get(senderId);
    if (sender) {
      await sender.pause();
    }
  }

  async resume(senderId) {
    const sender = this.senders.get(senderId);
    if (sender) {
      await sender.resume();
    }
  }


}

module.exports = MySender;