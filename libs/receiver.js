const Transport = require('./transport');
const Subscriber = require('./subscriber');

const logger = require('./logger').logger;
const log = logger.getLogger('receiver');

class Receiver extends Transport {
  constructor(id, router) {
    super(id, router);
    this.subscribers = new Map();

    this.role = 'sub';
  }

  async subscribe(publisherId) {
    const subscriber = new Subscriber(this, publisherId);

    subscriber.onsenderclose = _ => {
      log.debug(`publisherId : ${publisherId}, recevierId : ${subscriber.id} , receiver'sender closed.`)
      this.subscribers.delete(publisherId);
    };

    await subscriber.init()

    this.subscribers.set(publisherId, subscriber);

    return {
      subscriberId: subscriber.id,
      codec: subscriber.codec
    };
  }

  unsubscribe(publisherId) {
    const subscriber = this.subscribers.get(publisherId);
    if (subscriber) {
      subscriber.close();
      this.subscribers.delete(publisherId);
    }
  }

  async pause(publisherId) {
    const subscriber = this.subscribers.get(publisherId);
    if (subscriber) {
      await subscriber.pause();
    }
  }

  async resume(publisherId) {
    const subscriber = this.subscribers.get(publisherId);
    if (subscriber) {
      await subscriber.resume();
    }
  }

}

module.exports = Receiver;