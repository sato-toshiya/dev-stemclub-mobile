import RecordRTC from "recordrtc"
import SoundPlayer from "./SoundPlayer"
import WebUtils from "./WebUtils"
import localforage from "localforage"

let recorder1 = null
let isEdge =
  navigator.userAgent.indexOf("Edge") !== -1 &&
  (!!navigator.msSaveOrOpenBlob || !!navigator.msSaveBlob)
let recordSoundName = null
let bSupportMediaDevices = true

let audioContext = null
let analyser = null
let dataArray = null

export default class RecordSound {
  static loadAllSound() {
    if (window.Settings.enableLog) WebUtils.log("RecordSound.loadAllSound()")
    if (navigator.mediaDevices == undefined) {
      bSupportMediaDevices = false
      WebUtils.log("RecordSound Error: Not support!")
    } else {
      bSupportMediaDevices = true
      WebUtils.log("RecordSound support!")
    }
  }

  static loadSound(soundName, fcn) {
    if (window.Settings.enableLog) WebUtils.log("RecordSound.loadSound({0})".format(soundName))
    localforage.getItem(soundName, function (err, blob1) {
      if (err != null) {
        WebUtils.log("RecordSound.loadSound({0}),Error".format(soundName))
        WebUtils._fcnF(fcn, "error")
        return
      }
      if (blob1 == null) {
        WebUtils.log("RecordSound.loadSound({0}),Not exist.".format(soundName))
        WebUtils._fcnF(fcn, "error")
        return
      }
      let src = URL.createObjectURL(blob1)
      let strRe = SoundPlayer._createsound(soundName, src)
      if (window.Settings.enableLog)
        WebUtils.log("RecordSound.loadSound({0}) - ok.".format(soundName))
      WebUtils._fcnF(fcn, strRe)
    })
  }

  static captureMicrophone(callback, errorBack) {
    if (!bSupportMediaDevices) {
      errorBack("Not support")
      return
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: true,
      })
      .then(function (microphone) {
        callback(microphone)
      })
      .catch(function (error) {
        errorBack(error)
      })
  }

  static saveRecording(soundName, blob) {
    if (window.Settings.enableLog) WebUtils.log("RecordSound.saveRecording({0})".format(soundName))
    localforage.setItem(soundName, blob, function (err) {
      if (err != null) WebUtils.log("RecordSound.saveRecording({0}) - Error".format(soundName))
    })
  }

  static clearRecording(soundName) {
    localforage.removeItem(soundName)
  }

  static stopRecordingCallback() {
    if (!bSupportMediaDevices) {
      return
    }
    var blob1 = recorder1.getBlob()
    RecordSound.saveRecording(recordSoundName, blob1)
    let src = URL.createObjectURL(blob1)
    SoundPlayer._createsound(recordSoundName, src)
  }

  static askForPermission() {
    if (window.Settings.enableLog) WebUtils.log("RecordSound.askForPermission()")
    if (!bSupportMediaDevices) {
      return
    }
    RecordSound.captureMicrophone(
      function (microphone) {
        if (window.Settings.enableLog) WebUtils.log("RecordSound.askForPermission(),ok")
        microphone.getTracks().forEach((track) => track.stop())
      },
      function (error) {
        WebUtils.log("RecordSound.askForPermission(),error:{0}".format(error))
      },
    )
  }

  static recordsound_recordstart(fcn) {
    if (window.Settings.enableLog) WebUtils.log("RecordSound.recordsound_recordstart()")

    if (!navigator.mediaDevices) {
      WebUtils._fcnF(fcn, "-1")
      return
    }

    if (!bSupportMediaDevices) {
      WebUtils._fcnF(fcn, "-1")
      return
    }

    RecordSound.captureMicrophone(
      function (microphone) {
        if (window.Settings.enableLog) WebUtils.log("RecordSound.recordsound_recordstart(),ok")

        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)()
        }

        const source = audioContext.createMediaStreamSource(microphone)
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 256

        const bufferLength = analyser.frequencyBinCount
        dataArray = new Uint8Array(bufferLength)

        source.connect(analyser)

        if (isEdge) {
          recorder1 = RecordRTC(microphone, {
            type: "audio",
            recorderType: StereoAudioRecorder,
            numberOfAudioChannels: isEdge ? 1 : 2,
          })
        } else {
          recorder1 = RecordRTC(microphone, {
            type: "audio",
          })
        }

        recorder1.microphone = microphone
        recorder1.startRecording()

        recordSoundName = "{0}.wav".format(WebUtils.timeMD5())
        WebUtils._fcnF(fcn, recordSoundName)
      },
      function (error) {
        WebUtils.log("RecordSound.recordsound_recordstart(),error:{0}".format(error))
        WebUtils._fcnF(fcn, "-1")
      },
    )
  }

  static recordsound_recordstop(fcn) {
    if (window.Settings.enableLog) WebUtils.log("RecordSound.recordsound_recordstop()")
    if (!bSupportMediaDevices) {
      WebUtils._fcnF(fcn, "-1")
      return
    }
    if (recorder1 == null) {
      WebUtils._fcnF(fcn, "-1")
      return
    }

    recorder1.stopRecording(function () {
      if (window.Settings.enableLog)
        WebUtils.log("RecordSound.recordsound_recordstop(),stopRecording")

      RecordSound.stopRecordingCallback()

      if (recorder1.microphone) {
        recorder1.microphone.getTracks().forEach((track) => track.stop())
      }

      analyser = null
      dataArray = null

      WebUtils._fcnF(fcn, "1")
    })
  }

  static recordsound_volume(fcn) {
    if (!analyser || !dataArray) {
      WebUtils._fcnF(fcn, 0)
      return
    }

    analyser.getByteTimeDomainData(dataArray)

    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      const value = (dataArray[i] - 128) / 128
      sum += value * value
    }

    const rms = Math.sqrt(sum / dataArray.length)
    const level = Math.min(1, rms * 4)

    WebUtils._fcnF(fcn, level)
  }

  static recordsound_startplay(fcn) {
    if (window.Settings.enableLog) WebUtils.log("RecordSound.recordsound_startplay()")
    SoundPlayer.io_playsound(recordSoundName, fcn)
  }

  static recordsound_stopplay(fcn) {
    if (window.Settings.enableLog) WebUtils.log("RecordSound.recordsound_stopplay()")
    SoundPlayer.io_stopsound(recordSoundName, fcn)
  }

  static recordsound_recordclose(keep, fcn) {
    if (window.Settings.enableLog)
      WebUtils.log("RecordSound.recordsound_recordclose({0})".format(keep))
    if (keep == "NO" && recordSoundName != null) RecordSound.clearRecording(recordSoundName)
    WebUtils._fcnF(fcn, keep ? "1" : "-1")
  }
}
