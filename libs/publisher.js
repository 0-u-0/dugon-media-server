const Transport = require('./transport');
const Sender = require('./sender');

class Publisher extends Transport {
  constructor(id, router) {
    super(id, router);
    this.senders = new Map();
    this.role = 'pub';
  }

  async publish(codec, metadata) {
    const sender = new Sender(this, codec, metadata);

    sender.onclose = _ => {
      this.senders.delete(sender.id);
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

  async pause(senderId){
    const sender = this.senders.get(senderId);
    if (sender) {
      await sender.pause();
    }
  }

  async resume(senderId){
    const sender = this.senders.get(senderId);
    if (sender) {
      await sender.resume();
    }
  }


}

module.exports = Publisher;