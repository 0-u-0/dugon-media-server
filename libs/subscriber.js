const Transport = require('./transport');
const Receiver = require('./receiver');

class Subscriber extends Transport {
  constructor(id, router) {
    super(id, router);
    this.receivers = new Map();
  }

  async init() {
    await super.init(false);
  }

  async subscribe(senderId) {
    const receiver = new Receiver(this, senderId);

    receiver.onsenderclose = _ => {
      this.receivers.delete(senderId);
    };

    await receiver.init()
    
    this.receivers.set(senderId, receiver);

    return receiver.getParameters();
  }

  unsubscribe(senderId) {
    const receiver = this.receivers.get(senderId);
    receiver.close();
    this.receivers.delete(senderId);
  }

}

module.exports = Subscriber;