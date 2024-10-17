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

  async subscribe(senderId) {
    const receiver = new Subscriber(this, senderId);

    receiver.onsenderclose = _ => {
      log.debug(`senderId : ${senderId}, recevierId : ${receiver.id} , receiver'sender closed.`)
      this.receivers.delete(senderId);
    };

    await receiver.init()

    this.receivers.set(senderId, receiver);

    return {
      receiverId: receiver.id,
      codec: receiver.codec
    };
  }

  unsubscribe(senderId) {
    const receiver = this.receivers.get(senderId);
    if (receiver) {
      receiver.close();
      this.receivers.delete(senderId);
    }
  }

  async pause(senderId) {
    const receiver = this.receivers.get(senderId);
    if (receiver) {
      await receiver.pause();
    }
  }

  async resume(senderId) {
    const receiver = this.receivers.get(senderId);
    if (receiver) {
      await receiver.resume();
    }
  }

}

module.exports = MyReceiver;