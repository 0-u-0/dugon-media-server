const Codec = require('./codec')

class Sender {
  constructor(publisher, codec, metadata) {
    this.publisher = publisher
    this.producer = null;

    this.codec = Object.assign(new Codec(), codec);
    this.metadata = metadata;
  }

  async init() {

    this.producer = await this.publisher.transport.produce({
      kind: this.codec.kind,
      rtpParameters: this.codec.toRtpParameters(),
      metadata: this.metadata
    });//producer

    this.producer.on("transportclose", _ => {
      this.onclose();
    });
  }

  async pause() {
    await this.producer.pause();
  }

  async resume() {
    await this.producer.resume();
  }

  get id() {
    return this.producer.id;
  }

  close() {
    this.producer.close();
  }
}

module.exports = Sender;