declare module 'pcm-util' {
	interface PcmFormat {
		signed?: boolean;
		float?: boolean;
		bitDepth?: number;
		byteOrder?: string;
		channels?: number;
		sampleRate?: number;
		interleaved?: boolean;
		samplesPerFrame?: number;
		id?: string;
		max?: number;
		min?: number;
	}

	interface AudioBuffer {
		numberOfChannels: number;
		length: number;
		sampleRate: number;
		getChannelData(channel: number): Float32Array;
		_data?: ArrayBuffer;
	}

	const defaults: PcmFormat;
	function format(obj: any): PcmFormat;
	function normalize(format: PcmFormat): PcmFormat;
	function equal(a: PcmFormat, b: PcmFormat): boolean;
	function toArrayBuffer(audioBuffer: AudioBuffer, format: PcmFormat): ArrayBuffer;
	function toAudioBuffer(buffer: ArrayBuffer | Buffer, format?: PcmFormat): AudioBuffer;
	function convert(buffer: ArrayBuffer | Buffer, from: PcmFormat, to: PcmFormat): ArrayBuffer;

	export {
		defaults,
		format,
		normalize,
		equal,
		toArrayBuffer,
		toAudioBuffer,
		convert,
		PcmFormat,
		AudioBuffer,
	};
}
