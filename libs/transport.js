class Transport {
  constructor(id, router) {
    this.id = id;
    this.router = router;
    this.transport = null;
  }

  get transportParameters() {
    //TODO: 
    const dtls = {
      fingerprint: this.transport.dtlsParameters.fingerprints[2],
      role: 'server'
    };

    return {
      id: this.id,
      iceParameters: this.transport.iceParameters,
      iceCandidates: this.transport.iceCandidates,
      dtlsParameters: dtls,
    }
  }

  async init() {
    let isPub = false;
    if(this.role === 'pub'){
      isPub = true;
    }

    // TODO: move to config
    const webRtcTransportOptions =
    {
      listenIps:
        [
          {
            ip: '127.0.0.1',
            announcedIp: '127.0.0.1'
          }
        ],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      // Additional options that are not part of WebRtcTransportOptions.
      maxIncomingBitrate: 1500000,
      enableSctp: false,
      numSctpStreams: 0,
      appData: { consuming: !isPub, producing: isPub }
    };

    this.transport = await this.router.createWebRtcTransport(webRtcTransportOptions);
  }

  async setDtlsParameters(dtlsParameters) {
    await this.transport.connect({ dtlsParameters });
  }

  close(){
    this.transport.close();
  }

}

module.exports = Transport;