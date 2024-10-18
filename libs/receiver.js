const Transport = require('./transport');
const Subscriber = require('./subscriber');

const logger = require('./logger').logger;
const log = logger.getLogger('receiver');

class MyReceiver extends Transport {
  constructor(id, router) {
    super(id, router);
    this.receivers = new Map();

    this.role = 'sub';
  }

  async subscribe(publisherId) {
    const receiver = new Subscriber(this, publisherId);

    receiver.onsenderclose = _ => {
      log.debug(`publisherId : ${publisherId}, recevierId : ${receiver.id} , receiver'sender closed.`)
      this.receivers.delete(publisherId);
    };

    await receiver.init()

    this.receivers.set(publisherId, receiver);

    return {
      receiverId: receiver.id,
      codec: receiver.codec
    };
  }

  unsubscribe(publisherId) {
    const receiver = this.receivers.get(publisherId);
    if (receiver) {
      receiver.close();
      this.receivers.delete(publisherId);
    }
  }

  async pause(publisherId) {
    const receiver = this.receivers.get(publisherId);
    if (receiver) {
      await receiver.pause();
    }
  }

  async resume(publisherId) {
    const receiver = this.receivers.get(publisherId);
    if (receiver) {
      await receiver.resume();
    }
  }

}

module.exports = MyReceiver;