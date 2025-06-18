import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';
import WebSocket from 'ws';

export class WeChatPadProTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WeChatPadPro Trigger',
		name: 'weChatPadProTrigger',
		icon: 'file:wechatPadPro.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers the workflow when a new message is received via WeChatPadPro',
		defaults: {
			name: 'WeChatPadPro Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'weChatPadProApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: '场景',
				name: 'scene',
				type: 'options',
				options: [
					{
						name: '接收文本消息',
						value: 'text',
					},
					{
						name: '接收图片消息',
						value: 'image',
					},
				],
				default: 'text',
				description: '选择要监听的消息场景',
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<any> {
		const credentials = await this.getCredentials('weChatPadProApi');
		if (credentials === undefined) {
			throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
		}
		const { baseUrl, authKey } = credentials;

		const urlString = baseUrl.toString();
		const isSecure = urlString.startsWith('https://') || urlString.startsWith('wss://');
		const protocol = isSecure ? 'wss' : 'ws';

		const cleanBaseUrl = urlString.replace(/(^\w+:|^)\/\//, '');
		const wsUrl = `${protocol}://${cleanBaseUrl}/ws/GetSyncMsg?key=${authKey}`;

		let ws: WebSocket;
		let pingInterval: NodeJS.Timeout;

		const connect = () => {
			console.log('wsUrl===', wsUrl);
			ws = new WebSocket(wsUrl);

			ws.on('open', () => {
				this.logger.info('WeChatPadPro Trigger: WebSocket connection established.');
				pingInterval = setInterval(() => {
					if (ws.readyState === WebSocket.OPEN) {
						ws.ping();
					}
				}, 30000);
			});

			ws.on('message', (data: WebSocket.Data) => {
				try {
					const message = JSON.parse(data.toString());
					const scene = this.getNodeParameter('scene', 'text') as string;

					const msgType = message.msg_type;

					if (scene === 'text' && msgType === 1) {
						this.emit([this.helpers.returnJsonArray([message])]);
					} else if (scene === 'image' && msgType === 3) {
						this.emit([this.helpers.returnJsonArray([message])]);
					}
				} catch (error) {
					this.logger.error('WeChatPadPro Trigger: Error parsing WebSocket message.', error);
				}
			});

			ws.on('error', (error: Error) => {
				this.logger.error(`WeChatPadPro Trigger: WebSocket error: ${error.message}`);
			});

			ws.on('close', (code: number, reason: Buffer) => {
				clearInterval(pingInterval);
				this.logger.warn(
					`WeChatPadPro Trigger: WebSocket connection closed (code: ${code}, reason: ${reason.toString()}). Reconnecting...`,
				);
				setTimeout(connect, 5000);
			});
		};

		connect();

		return {
			dispose: async () => {
				if (pingInterval) {
					clearInterval(pingInterval);
				}
				if (ws) {
					ws.removeAllListeners();
					ws.close();
				}
			},
		};
	}
}
