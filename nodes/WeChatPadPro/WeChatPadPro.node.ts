import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
	IHttpRequestMethods,
	IDataObject,
	INodeCredentialTestResult,
	ICredentialTestFunctions,
	ICredentialsDecrypted,
	ICredentialDataDecryptedObject,
	ApplicationError,
} from 'n8n-workflow';

export class WeChatPadPro implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WeChatPadPro',
		name: 'weChatPadPro',
		icon: 'file:wechatPadPro.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: '调用 WeChatPadPro 功能',
		defaults: {
			name: 'WeChatPadPro',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'weChatPadProApi',
				required: true,
				testedBy: 'testCredential',
			},
		],
		properties: [
			// Resource
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'User',
						value: 'user',
						description: '用户相关操作',
					},
					{
						name: 'Message',
						value: 'message',
						description: '消息相关操作',
					},
				],
				default: 'user',
			},
			// User Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['user'],
					},
				},
				options: [
					{
						name: '获取个人资料信息',
						value: 'getProfile',
						action: '获取个人资料信息',
						description: '获取当前登录账号的个人资料',
					},
				],
				default: 'getProfile',
			},
			// Message Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['message'],
					},
				},
				options: [
					{
						name: '发送文本消息',
						value: 'sendTextMessage',
						action: '发送文本消息',
						description: '发送文本消息给指定联系人或群组',
					},
					{
						name: '发送图片消息',
						value: 'sendImageMessage',
						action: '发送图片消息',
						description: '发送图片消息给指定联系人或群组',
					},
				],
				default: 'sendTextMessage',
			},
			// Send Text Message Fields
			{
				displayName: '消息接收方 ID',
				name: 'toUserName',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendTextMessage', 'sendImageMessage'],
					},
				},
				description: '接受消息方 ID（微信 ID 或群聊 ID）',
			},
			{
				displayName: '消息内容',
				name: 'textContent',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendTextMessage'],
					},
				},
				description: '消息文本内容',
			},
			{
				displayName: 'At WxId 列表',
				name: 'atWxIdList',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendTextMessage'],
					},
				},
				description: 'At 的微信 ID 列表，以逗号分隔 (仅在群聊可用)',
			},
			// Send Image Message Fields
			{
				displayName: '图片内容 (Base64)',
				name: 'imageContent',
				type: 'string',
				typeOptions: {
					multiline: true,
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						resource: ['message'],
						operation: ['sendImageMessage'],
					},
				},
				description: '图片的 Base64 编码内容',
			},
		],
	};
	methods = {
		credentialTest: {
			async testCredential(
				this: ICredentialTestFunctions,
				credential: ICredentialsDecrypted,
			): Promise<INodeCredentialTestResult> {
				const { baseUrl, authKey } = credential.data as ICredentialDataDecryptedObject;

				if (!baseUrl) {
					throw new ApplicationError('BaseUrl is missing in credentials!');
				}

				const cleanBaseUrl = baseUrl.toString().replace(/\/$/, '');
				const url = `${cleanBaseUrl}/user/GetProfile?key=${authKey}`;

				try {
					const response = (await this.helpers.request({
						method: 'GET',
						url,
						json: true,
					})) as IDataObject;

					if (response.Code === 200) {
						return { status: 'OK', message: '授权成功' };
					} else {
						return {
							status: 'Error',
							message: `授权失败，错误信息: ${response.Msg || '未知错误'}`,
						};
					}
				} catch (error) {
					return { status: 'Error', message: error.message };
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i, '') as string;
				const operation = this.getNodeParameter('operation', i, '') as string;

				const credentials = await this.getCredentials('weChatPadProApi');
				if (credentials === undefined) {
					throw new NodeOperationError(this.getNode(), 'No credentials got returned!');
				}

				const { baseUrl, authKey } = credentials;

				if (resource === 'user') {
					if (operation === 'getProfile') {
						const options = {
							method: 'GET' as IHttpRequestMethods,
							url: `${baseUrl}/user/GetProfile`,
							qs: {
								key: authKey,
							},
							json: true,
						};

						const responseData = await this.helpers.httpRequest(options);
						returnData.push({ json: responseData });
					}
				}

				if (resource === 'message') {
					if (operation === 'sendTextMessage') {
						const toUserName = this.getNodeParameter('toUserName', i, '') as string;
						const textContent = this.getNodeParameter('textContent', i, '') as string;
						const atWxIdListRaw = this.getNodeParameter('atWxIdList', i, '') as string;

						const msgItem: any = {
							ToUserName: toUserName,
							TextContent: textContent,
							MsgType: 0,
						};

						if (atWxIdListRaw) {
							msgItem.AtWxIdList = atWxIdListRaw.split(',').map((id) => id.trim());
						}

						const body = {
							MsgItem: [msgItem],
						};

						const options = {
							method: 'POST' as IHttpRequestMethods,
							url: `${baseUrl}/message/SendTextMessage`,
							qs: {
								key: authKey,
							},
							headers: {
								'Content-Type': 'application/json',
							},
							body: body,
							json: true,
						};

						const responseData = await this.helpers.httpRequest(options);
						returnData.push({ json: responseData });
					}

					if (operation === 'sendImageMessage') {
						const toUserName = this.getNodeParameter('toUserName', i, '') as string;
						const imageContent = this.getNodeParameter('imageContent', i, '') as string;

						const msgItem = {
							ToUserName: toUserName,
							ImageContent: imageContent,
							MsgType: 2, // 2 for Image
						};

						const body = {
							MsgItem: [msgItem],
						};

						const options = {
							method: 'POST' as IHttpRequestMethods,
							url: `${baseUrl}/message/SendImageMessage`,
							qs: {
								key: authKey,
							},
							headers: {
								'Content-Type': 'application/json',
							},
							body: body,
							json: true,
						};

						const responseData = await this.helpers.httpRequest(options);
						returnData.push({ json: responseData });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: error.message }, pairedItem: { item: i } });
					continue;
				}
				throw new NodeOperationError(this.getNode(), error);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
