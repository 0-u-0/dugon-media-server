const Transport = require('./transport');
const Receiver = require('./receiver');

class Subscriber extends Transport {
  constructor(id, router) {
    super(id, router);
    this.receivers = new Map();

    this.role = 'sub';
  }

  async subscribe(senderId) {
    const receiver = new Receiver(this, senderId);

    receiver.onclose = _ => {
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

module.exports = Subscriber;