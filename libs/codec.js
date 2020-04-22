


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
    this.dtx = null;
    this.cname = null;
    this.senderPaused = false;

    // payload, ssrc
    this.rtx = null;

    // [{id,uri}]
    this.extensions = [];
    // [{key:value}]
    this.parameters = [];
    // [{type,parameter}]
    this.rtcpFeedback = [];
  }

  // caps -> client
  static initByCaps(originCap) {
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
        codec.parameters = c.parameters;

        codecMap[realName] = codec;
      }   
    }

    return codecMap;
  }

}

module.exports = Codec;