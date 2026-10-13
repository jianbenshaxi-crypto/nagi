// AudioWorklet: 白色・ピンク・褐色（ブラウン）ノイズを生成する。
// color は processorOptions.color で指定し、各自然音の「地の音」の材料として使う。
class NoiseProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.color = options?.processorOptions?.color ?? 'brown';

    // brown用
    this.lastOut = 0;

    // pink用（Paul Kelletの近似式）
    this.b0 = 0;
    this.b1 = 0;
    this.b2 = 0;
    this.b3 = 0;
    this.b4 = 0;
    this.b5 = 0;
    this.b6 = 0;
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    for (let channel = 0; channel < output.length; channel++) {
      const outputChannel = output[channel];
      for (let i = 0; i < outputChannel.length; i++) {
        const white = Math.random() * 2 - 1;
        let sample;

        if (this.color === 'white') {
          sample = white * 0.6;
        } else if (this.color === 'pink') {
          this.b0 = 0.99886 * this.b0 + white * 0.0555179;
          this.b1 = 0.99332 * this.b1 + white * 0.0750759;
          this.b2 = 0.969 * this.b2 + white * 0.153852;
          this.b3 = 0.8665 * this.b3 + white * 0.3104856;
          this.b4 = 0.55 * this.b4 + white * 0.5329522;
          this.b5 = -0.7616 * this.b5 - white * 0.016898;
          const pink = this.b0 + this.b1 + this.b2 + this.b3 + this.b4 + this.b5 + this.b6 + white * 0.5362;
          this.b6 = white * 0.115926;
          sample = pink * 0.11;
        } else {
          this.lastOut = (this.lastOut + 0.02 * white) / 1.02;
          sample = this.lastOut * 3.5;
        }

        // tanhで滑らかに飽和させ、万一振幅が超過してもデジタルクリッピング
        // （バリバリという歪み音）にならないようにする
        outputChannel[i] = Math.tanh(sample);
      }
    }
    return true;
  }
}

registerProcessor('noise-processor', NoiseProcessor);
