import React from 'react';
//import axios from 'axios';


export default class Record extends React.Component {

  state = {
    isRecording: false
  }

  startRecording = () => navigator.getUserMedia({ audio: true }, this.onSuccess, this.onError);

  onSuccess = (stream) => {
    this.setState({ isRecording: true });
    this.client = new WebSocket('ws://localhost:4000');
    this.client.binaryType = "arraybuffer";
    this.chunks = []
    this.initializeRecorder(stream);

    this.mediaRecorder = new MediaRecorder(stream, {})
    this.mediaRecorder.start();

    this.mediaRecorder.ondataavailable = e => {
      this.chunks.push(e.data)
    }

    this.mediaRecorder.onstop = e => {
      const blob = new Blob(this.chunks, { type: 'audio/wav' })
      this.chunks = []
      this.onStop(blob)
    }
    window.streamReference = stream;
  }

  onError = (error) => {
    console.warn('Audio recording APIs not supported by this browser')
  }

  initializeRecorder = (stream) => {

    let context = new AudioContext();
    let audioInput = context.createMediaStreamSource(stream);
    const bufferSize = 2048;
    // create a javascript node
    this.recorder = context.createScriptProcessor(bufferSize, 1, 1);
    // specify the processing function
    this.recorder.onaudioprocess = this.recorderProcess;
    // connect stream to our recorder
    audioInput.connect(this.recorder);
    // connect our recorder to the previous destination
    this.recorder.connect(context.destination);
  }


  recorderProcess = (data) => {
    let left = data.inputBuffer.getChannelData(0);
    console.log(data);
    this.client.send(this.convertFloat32ToInt16(left));
  }

  onStop = (blob) => {
    this.recorder.disconnect();
    if (!window.streamReference) return;

    window.streamReference.getAudioTracks().forEach(function (track) {
      track.stop();
    });

    window.streamReference.getVideoTracks().forEach(function (track) {
      track.stop();
    });

    window.streamReference = null;
    this.client.close();

    this.downloadBlob(blob, 'output.wav');

  }

  downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const click = document.createEvent('Event');
    click.initEvent('click', true, true);

    const link = document.createElement('A');
    link.href = url;
    link.download = filename;
    link.dispatchEvent(click);
    link.click();
    return link;
  }

  convertFloat32ToInt16 = (buffer) => {
    let bufferLength = buffer.length;
    let array = new Int16Array(bufferLength);
    while (bufferLength--) {
      array[bufferLength] = Math.min(1, buffer[bufferLength]) * 0x7FFF;
    }
    return array.buffer;
  }

  stopRecording = () => {
    this.mediaRecorder.stop();
    this.setState({ isRecording: false })
  }

  render() {
    const { isRecording } = this.state;

    return (
      <button onClick={isRecording ? this.stopRecording : this.startRecording} type="button">{isRecording ? 'Stop' : 'Start'}</button>
    );
  }
}
