import {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	NodeConnectionType,
	NodeOperationError,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { parseStringPromise } from 'xml2js';
import WebSocket from 'ws';
import { Buffer } from 'buffer';

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
						name: '接收语音消息',
						value: 'voice',
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
						scene: ['text', 'voice', 'image'],
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
						scene: ['text', 'voice', 'image'],
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
					message.msgContent = message.content?.str;
					delete message.fromUserName;
					delete message.toUserName;
					delete message.content;
					// 引用消息逻辑处理
					if (message.msg_source) {
						try {
							const sourceData = await parseStringPromise(message.msg_source, {
								explicitArray: false,
								ignoreAttrs: true,
								charkey: 'text',
								trim: true,
							});
							message.msgSource = sourceData?.msgsource;
							const msgJson = await parseStringPromise(message.msgContent, {
								explicitArray: false,
								ignoreAttrs: true,
								charkey: 'text',
								trim: true,
							});
							message.contentJson = msgJson;
							delete message.msg_source;
						} catch (e) {
							// 忽略 msg_source 解析错误
						}
					}

					// 检查消息是否符合触发条件
					let shouldTrigger = false;
					if ([1, 3, 34].includes(msgType)) {
						// 判断是否为群聊消息
						const isGroupMessage = message.fromUserName?.includes('@chatroom');

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
					}
					if (shouldTrigger && msgType === 3) {
						try {
							const bigImgUrl = `${baseUrl}/message/GetMsgBigImg?key=${authKey}`;
							let startPos = 0;
							let totalLen: number | null = null;
							let imageData: Buffer[] = []; // 使用 Buffer 数组存储数据块

							while (totalLen === null || startPos < totalLen) {
								const requestBody: any = {
									CompressType: 0,
									FromUserName: message.FromUserName,
									MsgId: message.msg_id,
									Section: { DataLen: 65536, StartPos: startPos },
									ToUserName: message.ToUserName,
									TotalLen: totalLen === null ? undefined : totalLen,
								};

								const options: IHttpRequestOptions = {
									method: 'POST',
									url: bigImgUrl,
									json: true,
									body: requestBody,
								};

								const { Code, Data } = await this.helpers.httpRequest(options);

								if (Code !== 200) {
									this.logger.error(`WeChatPadPro Trigger: 获取图片分段失败，Code: ${Code}`);
									break;
								}

								const dataBuffer = Data.Data.Buffer;
								if (!dataBuffer) {
									this.logger.error('WeChatPadPro Trigger: 响应中缺少图片数据');
									break;
								}
								try {
									const chunkData = Buffer.from(dataBuffer, 'base64');
									if (chunkData.length === 0) {
										this.logger.warn('WeChatPadPro Trigger: 接收到空数据块');
										break;
									}

									imageData.push(chunkData);
									const chunkSize = chunkData.length;
									startPos += chunkSize;

									if (totalLen === null) {
										totalLen = Data?.TotalLen;
										if (typeof totalLen !== 'number' || totalLen <= 0) {
											this.logger.error('WeChatPadPro Trigger: 无效的图片总长度');
											break;
										}
										this.logger.info(`WeChatPadPro Trigger: 图片总长度: ${totalLen} 字节`);
									}

									this.logger.info(`WeChatPadPro Trigger: 下载进度: ${startPos}/${totalLen}`);
								} catch (e) {
									this.logger.error(`WeChatPadPro Trigger: Base64解码失败: ${e.message}`);
									break;
								}
							}

							if (totalLen !== null && startPos === totalLen) {
								const fullImageData = Buffer.concat(imageData);
								message.msgContent = fullImageData.toString('base64');
								this.logger.info(`WeChatPadPro Trigger: 图片下载完成，大小: ${fullImageData.length} 字节`);
							} else {
								this.logger.warn('WeChatPadPro Trigger: 图片下载未完成或遇到问题。');
							}

							delete message.img_buf;
						} catch (error) {
							this.logger.error(`WeChatPadPro Trigger: Error getting big image: ${error.message}`);
						}
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
