
function getRealCodecName(codecName, parameters) {
  if (codecName === 'H264') {
    /**
    const H264_BASELINE = '42001f';
    const H264_CONSTRAINED_BASELINE = '42e01f'
    const H264_MAIN = '4d0032'
    const H264_HIGH = '640032'
     */
    let profile;
    if (parameters['profile-level-id'] == '42001f') {
      profile = '-BASELINE';
    } else if (parameters['profile-level-id'] == '42e01f') {
      profile = '-CONSTRAINED-BASELINE';
    } else if (parameters['profile-level-id'] == '4d0032') {
      profile = '-MAIN';
    } else if (parameters['profile-level-id'] == '640032') {
      profile = '-HIGH';
    }
    codecName = codecName + profile;
  }
  return codecName
}

class Extension {
  constructor(id, uri, send = false, recv = false) {
    this.id = id;
    this.uri = uri;
    this.send = send;
    this.recv = recv;
  }
}

class RtpCodec {
  constructor(mimeType, payloadType, channels, clockRate, parameters = {}, rtcpFeedback = []) {
    this.mimeType = mimeType;
    this.payloadType = payloadType;
    this.channels = channels;
    this.clockRate = clockRate;
    this.parameters = parameters;
    this.rtcpFeedback = rtcpFeedback;
  }
}

class Codec {
  constructor() {
    this.kind = null;
    this.payload = null;
    this.codecName = null;
    this.codecFullName = null;
    this.clockRate = null;
    this.channels = null;

    /**options */
    this.mid = null;
    this.ssrc = null;
    this.cname = null;

    this.dtx = false;
    this.senderPaused = false;

    this.reducedSize = true;
    // payload, ssrc
    this.rtx = null;

    // [{id,uri}]
    this.extensions = [];
    // {key:value}
    this.parameters = {};
    // [{type,parameter}]
    this.rtcpFeedback = [];

  }

  // caps -> client
  static cap2Codecs(originCap) {
    let { codecs, headerExtensions } = JSON.parse(JSON.stringify(originCap));

    let videoExtension = [];
    let audioExtension = [];
    for (let extension of headerExtensions) {

      let send = false, recv = false;
      if (extension.direction.includes('send')) {
        send = true;
      }
      if (extension.direction.includes('recv')) {
        recv = true;
      }
      let ne = new Extension(extension.preferredId, extension.uri, send, recv);
      if (extension.kind == 'video') {
        videoExtension.push(ne);
      } else if (extension.kind == 'audio') {
        audioExtension.push(ne)
      }
    }

    const extensions = {
      video: videoExtension,
      audio: audioExtension
    }

    let codecMap = {};
    for (let c of codecs) {
      let codecName = c.mimeType.split('/')[1];
      let realName = getRealCodecName(codecName, c.parameters);
      if (codecName != 'rtx') {
        let codec = new Codec();
        codec.kind = c.kind;
        codec.payload = c.preferredPayloadType;
        codec.codecName = codecName;
        codec.codecFullName = realName;
        codec.clockRate = c.clockRate;
        codec.channels = c.channels ? c.channels : 1

        /** */
        codec.extensions = extensions[c.kind];
        codec.rtcpFeedback = c.rtcpFeedback;
        for (let k in c.parameters) {
          codec.parameters[k] = String(c.parameters[k]);
        }

        codecMap[realName] = codec;
      }
    }

    return codecMap;
  }

  pairParseInt(pairs) {
    for (let k in pairs) {
      let value = pairs[k];
      if (String(parseInt(value)).length === value.length) {
        pairs[k] = parseInt(value)
      }
    }
    return pairs
  }

  toRtpParameters() {

    const parameters = this.pairParseInt(this.parameters);

    const codecs = [
      new RtpCodec(`${this.kind}/${this.codecName}`, this.payload, this.channels, this.clockRate, parameters, this.rtcpFeedback)
    ]

    const encodings = [
      {
        "ssrc": this.ssrc,
        "dtx": this.dtx,
      }
    ]
    if (this.rtx) {
      codecs.push(new RtpCodec("video/rtx", this.rtx.payload, this.channels, this.clockRate, {
        "apt": this.payload
      }))
      encodings[0]["rtx"] = {
        ssrc: this.rtx.ssrc
      }
    }
    const headerExtensions = this.extensions;
    const rtcp = {
      "reducedSize": true,
      "cname": this.cname
    }

    return {
      mid: this.mid,
      codecs,
      headerExtensions,
      rtcp,
      encodings
    }

  }

}

module.exports = Codec;