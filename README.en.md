# n8n-nodes-wechat-pad-pro

English | [简体中文](./README.md)

---

This is an n8n community node that allows you to use [WeChatPadPro](https://github.com/WeChatPadPro/WeChatPadPro) in your n8n workflows.

WeChatPadPro is a WeChat management tool based on the WeChat Pad protocol, which can be used to automate sending and receiving WeChat messages, as well as managing contacts and accounts.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)
[Compatibility](#compatibility)
[Resources](#resources)

## Installation

There are two ways to install this community node:

1.  **[Install via the n8n GUI](https://docs.n8n.io/integrations/community-nodes/installation/gui-install/)**: Search for `n8n-nodes-wechat-pad-pro` in the "Community Nodes" section of n8n and install it.
2.  **[Manual installation via command line](https://docs.n8n.io/integrations/community-nodes/installation/manual-install/)**: If your n8n instance does not support GUI installation, you can install it manually.

## Operations

This node supports the following operations:

**User**
*   Get Profile Information

**Message**
*   Send Text Message
*   Send Image Message

**Trigger**
*   **Receive New Message**: Triggers the workflow when a new message is received.
    *   **Scene**:
        *   `Receive Text Message`: Triggers only on text messages (msg_type == 1).
        *   `Receive Image Message`: Triggers only on image messages (msg_type == 3).

## Credentials

To use this node, you need to configure the WeChatPadPro API credentials.

1.  **BaseUrl**: The URL address of your WeChatPadPro service.
2.  **AuthKey**: The authorization key for your WeChatPadPro service.

You need to set up your own WeChatPadPro service to obtain these credentials.

## Compatibility

*   **Minimum n8n Version**: This node follows n8n's `n8nNodesApiVersion: 1` and is recommended for use with the latest version of n8n.
*   **Node.js Version**: Requires `>=20.15`.

## Resources

*   [n8n Community Nodes Documentation](https://docs.n8n.io/integrations/#community-nodes)
*   [WeChatPadPro Project](https://github.com/WeChatPadPro/WeChatPadPro)
*   [This Project's GitHub Repository](https://github.com/LegendLeo/n8n-nodes-wechat-pad-pro)
