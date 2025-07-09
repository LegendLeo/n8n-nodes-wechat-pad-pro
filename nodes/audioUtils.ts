import * as pcmUtil from 'pcm-util';
// import { WaveFile } from 'wavefile';
import { decode } from 'silk-wasm';
import { encode } from 'node-wav';

/**
 * Converts a PCM buffer to a WAV file in base64 format.
 * @param silkBuffer The silk data buffer.
 * @returns A Promise that resolves with the WAV file as a base64 string.
 */
export async function silkToWavBase64(silkBuffer: Buffer): Promise<string> {
	// silk-wasm 默认解码为 24000 Hz, Float32Array PCM
	// 将 Buffer 转换为 ArrayBuffer
	const pcmData = await decode(silkBuffer, 24000);
	console.log('🚀 ~ pcmData:', pcmData);
	const audioBuffer = pcmUtil.toAudioBuffer(pcmData.data, {
		bitDepth: 16,
		channels: 1,
		sampleRate: 24000,
	});
	// console.log('🚀 ~ audioBuffer:', audioBuffer);

	// const wav = new WaveFile(pcmData.data);
	const channelData: Float32Array[] = [];
	for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
		channelData.push(audioBuffer.getChannelData(i));
	}

	// wav.fromScratch(audioBuffer.numberOfChannels, audioBuffer.sampleRate, '16', channelData);

	// return wav.toBase64();
	const wavBuffer = encode(channelData, { sampleRate: audioBuffer.sampleRate, float: true, bitDepth: 16 });
	return wavBuffer.toString('base64')
}

export async function silkToPcmBase64(silkBuffer: Buffer): Promise<string> {
	const pcmData = await decode(silkBuffer, 24000);
	return pcmData.data.toString();
}
