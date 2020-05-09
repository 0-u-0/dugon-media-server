class MediaServer {
  constructor(id, pipe) {
    this.id = id;
    this.pipe = pipe;
    this.isActive = false;
    this.heartbeatCheckTimer = null;
    this.pipeConsumers = new Map();
    this.pipeProducers = new Map();
  }

  init() {
    this.isActive = true;
    this.heartbeatCheckTimer = setInterval(() => {
      if (this.isActive) {
        this.isActive = false;
      } else {
        clearInterval(this.heartbeatCheckTimer);
        this.pipe.close();
        this.onclose();

      }
    }, 3000)
  }

  get tuple() {
    if (this.pipe) {
      return {
        id: this.id,
        ip: this.pipe.tuple.localIp,
        port: this.pipe.tuple.localPort,
      }
    }
  }

  async connect(ip, port) {
    if (this.pipe) {
      console.log('connect');

      await this.pipe.connect({ ip, port });
    }
  }

  async consume(producerId) {
    if (!this.pipeConsumers.has(producerId)) {
      const consumer = await this.pipe.consume({ producerId });
      this.pipeConsumers.set(producerId, consumer);
      return { rtpParameters: consumer.rtpParameters, kind: consumer.kind };
    }
    return null;
  }

  async produce(producerId, kind, rtpParameters) {
    if (!this.pipeProducers.has(producerId)) {
      const producer = await this.pipe.produce({ id: producerId, kind: kind, rtpParameters });
      this.pipeProducers.set(producerId, producer);
    }
  }
}

module.exports = MediaServer;