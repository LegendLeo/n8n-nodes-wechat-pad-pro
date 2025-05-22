import { INodeType, INodeTypeDescription, NodeConnectionType } from 'n8n-workflow';

export class WeChatPadPro implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WeChatPadPro',
		name: 'weChatPadPro',
		icon: 'file:wechat.svg',
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
				name: 'WeChatPadProApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'HTTP Verb',
						value: 'httpVerb',
					},
				],
				default: 'httpVerb',
			}
		]
	}
}
