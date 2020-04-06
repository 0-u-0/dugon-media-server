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

    return receiver.getParameters();
  }

  unsubscribe(senderId) {
    const receiver = this.receivers.get(senderId);
    receiver.close();
    this.receivers.delete(senderId);
  }

}

module.exports = Subscriber;