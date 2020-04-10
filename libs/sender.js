

class Sender {
  constructor(publisher, kind, rtpParameters, metadata) {
    this.publisher = publisher
    this.producer = null;

    this.kind = kind;
    this.rtpParameters = rtpParameters;
    this.metadata = metadata;
  }

  async init() {
    this.producer = await this.publisher.transport.produce({
      kind: this.kind,
      rtpParameters: this.rtpParameters,
      metadata: this.metadata
    });//producer

    this.producer.on("transportclose", _ => {
      this.onclose();
    });
  }

  async pause(){
    await this.producer.pause();
  }

  async resume(){
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