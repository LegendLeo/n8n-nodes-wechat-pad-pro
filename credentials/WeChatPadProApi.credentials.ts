import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WeChatPadProApi implements ICredentialType {
	name = 'weChatPadProApi';
	displayName = 'WeChatPadPro API';
	documentationUrl = 'https://github.com/wechaty/wechat-padpro';
	properties: INodeProperties[] = [
		{
			displayName: 'BaseUrl',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'WeChatPadPro 服务的 URL 地址',
		},
		{
			displayName: 'AuthKey',
			name: 'authKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'WeChatPadPro 服务的授权密钥',
		}
	];
}
