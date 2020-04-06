class Transport {
  constructor(id, router) {
    this.id = id;
    this.router = router;
    this.transport = null;
  }

  get transportParameters() {
    //TODO: make these parameters as attributes

    //FIXME: maybe provide more options?
    const dtls = {
      fingerprint: this.transport.dtlsParameters.fingerprints[2],
      role: 'server'
    };


    //https://tools.ietf.org/id/draft-ietf-mmusic-ice-sip-sdp-14.html#rfc.section.5.1
    const candidates = [];
    for (let candidate of this.transport.iceCandidates) {
      candidates.push({
        foundation: candidate.foundation,
        ip: candidate.ip,
        port: candidate.port,
        priority: candidate.priority,
        transport: candidate.protocol,
        type: candidate.type,
        component: 1 //FIXME: use BUNDLE as default
      })
    }

    return {
      id: this.id,
      iceParameters: this.transport.iceParameters,
      iceCandidates: candidates,
      dtlsParameters: dtls,
    }
  }

  async init() {
    let isPub = false;
    if (this.role === 'pub') {
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

  close() {
    this.transport.close();
  }

}

module.exports = Transport;