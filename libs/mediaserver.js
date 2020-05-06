class MediaServer {
  constructor(id, pipe) {
    this.id = id;
    this.pipe = pipe;
    this.isActive = false;
    this.heartbeatCheckTimer = null;
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
}

module.exports = MediaServer;