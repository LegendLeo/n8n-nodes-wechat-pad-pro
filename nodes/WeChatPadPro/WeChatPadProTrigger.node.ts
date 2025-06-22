import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';
import { parseStringPromise } from 'xml2js';
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
					{
						name: '其他事件',
						value: 'other',
					},
				],
				default: 'text',
				description: '选择要监听的消息场景',
			},
			{
				displayName: '群聊消息接收规则',
				name: 'groupMessageRule',
				type: 'options',
				displayOptions: {
					show: {
						scene: ['text'],
					},
				},
				options: [
					{
						name: '接收全部消息',
						value: 'all',
					},
					{
						name: '接收@机器人消息',
						value: 'mention',
					},
					{
						name: '不接收消息',
						value: 'none',
					},
				],
				default: 'all',
				description: '选择群聊消息接收规则',
			},
			{
				displayName: '群聊白名单',
				name: 'groupWhitelist',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						scene: ['text'],
						groupMessageRule: ['all', 'mention'],
					},
				},
				default: [],
				description: '设置允许接收消息的群聊ID列表',
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

			ws.on('message', async (data: WebSocket.Data) => {
				try {
					const message = JSON.parse(data.toString());
					const scene = this.getNodeParameter('scene', 'text') as string;
					const groupMessageRule = this.getNodeParameter('groupMessageRule', 'all') as string;

					const msgType = message.msg_type;

					// 解析字段，并处理（原字段保留）
					message.fromUserName = message.from_user_name?.str;
					message.toUserName = message.to_user_name?.str;
					if (message.msg_source) {
						try {
							const sourceData = await parseStringPromise(message.msg_source, {
								explicitArray: false,
								ignoreAttrs: true,
								charkey: 'text',
								trim: true,
							});
							message.msgSource = sourceData?.msgsource;
						} catch (e) {
							// 忽略 msg_source 解析错误
						}
					}

					// 检查消息是否符合触发条件
					let shouldTrigger = false;

					if (scene === 'text' && msgType === 1) {
						// 判断是否为群聊消息
						const isGroupMessage = message.fromUserName?.includes('@chatroom');
						console.log('message.fromUserName===', message.fromUserName, isGroupMessage)

						if (!isGroupMessage) {
							// 非群聊消息直接触发
							shouldTrigger = true;
						} else {
							// 群聊消息根据规则处理
							switch (groupMessageRule) {
								case 'all':
									shouldTrigger = true;
									break;
								case 'mention':
									// 检查是否@了机器人
									shouldTrigger = message.msgSource?.atuserlist?.includes(message.toUserName);
									break;
								case 'none':
									shouldTrigger = false;
									break;
							}

							// 检查群聊白名单
							const groupWhitelist = this.getNodeParameter('groupWhitelist', []) as string[];
							if (shouldTrigger && groupWhitelist.length > 0) {
								shouldTrigger = groupWhitelist.includes(message.fromUserName);
							}
						}
					} else if (scene === 'image' && msgType === 3) {
						shouldTrigger = true; // 图片消息保持原有逻辑
					}

					if (shouldTrigger || scene === 'other') {
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
