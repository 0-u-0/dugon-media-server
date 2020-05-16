const logger = require('./logger').logger;
const log = logger.getLogger('mediaserver');

//Remote media server
class MediaServer {
  constructor(id, salt, pipe) {
    this.id = id;
    this.salt = salt;
    this.pipe = pipe;
    this.isActive = false;
    this.heartbeatCheckTimer = null;
    this.pipeConsumers = new Map();
    this.pipeProducers = new Map();

    this.connected = false;

  }

  init() {
    this.isActive = true;
    this.heartbeatCheckTimer = setInterval(() => {
      if (this.isActive) {
        this.isActive = false;
      } else {
        this.close();
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
    if (this.pipe && !this.connected) {
      this.connected = true;
      log.info(`Connect to pipe ${ip}:${port}`);

      await this.pipe.connect({ ip, port });
    }
  }

  async consume(producerId) {
    if (!this.pipeConsumers.has(producerId)) {
      const consumer = await this.pipe.consume({ producerId });
      consumer.on('producerclose', () => {
        log.debug(`Media consumer'producer closed : ${producerId}`);
        this.pipeConsumers.delete(producerId);
      });
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

  async unproduce(producerId) {
    const producer = this.pipeProducers.get(producerId);
    if (producer) {
      producer.close();
      this.pipeProducers.delete(producerId);
      log.debug(`Media pipeline producer closed : ${producerId}`);
    }
  }

  async pause(producerId) {
    const producer = this.pipeProducers.get(producerId);
    if (producer) {
      await producer.pause();
      log.debug(`Media pipeline producer pause : ${producerId}`);
    }
  }


  async resume(producerId) {
    const producer = this.pipeProducers.get(producerId);
    if (producer) {
      await producer.resume();
      log.debug(`Media pipeline producer resume : ${producerId}`);
    }
  }

  //manual close
  close() {
    log.info(`mediaserver: ${this.id} closed`);
    clearInterval(this.heartbeatCheckTimer);
    this.pipe.close();
  }
}

module.exports = MediaServer;