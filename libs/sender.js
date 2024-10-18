const Transport = require('./transport');
const Publisher = require('./publisher');

const logger = require('./logger').logger;
const log = logger.getLogger('sender');

class Sender extends Transport {
  constructor(id, router) {
    super(id, router);
    this.publishers = new Map();
    this.role = 'pub';
  }

  async publish(codec, metadata) {
    // TODO(cc): 10/17/24 rename sender
    const publisher = new Publisher(this, codec, metadata);

    publisher.ontransportclose = _ => {
      this.publishers.delete(publisher.id);
      log.debug(`PublisherId ${publisher.id} sender'transport closed.`);
    };

    await publisher.init();
    this.publishers.set(publisher.id, publisher);
    return publisher.id;
  }

  unpublish(publisherId) {
    const publisher = this.publishers.get(publisherId);
    if (publisher) {
      publisher.close();
      this.publishers.delete(publisherId);
    }
  }

  async pause(publisherId) {
    const publisher = this.publishers.get(publisherId);
    if (publisher) {
      await publisher.pause();
    }
  }

  async resume(publisherId) {
    const publisher = this.publishers.get(publisherId);
    if (publisher) {
      await publisher.resume();
    }
  }


}

module.exports = Sender;