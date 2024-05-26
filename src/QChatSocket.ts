import "./polyfill";
import QChatSDK from "nim-web-sdk-ng/dist/QCHAT_BROWSER_SDK";
import NIMSDK from "nim-web-sdk-ng/dist/NIM_BROWSER_SDK";
import type { LoginResult } from "nim-web-sdk-ng/dist/QCHAT_BROWSER_SDK/types";
import type {
  SubscribeAllChannelResult,
  ServerInfo,
} from "nim-web-sdk-ng/dist/QCHAT_BROWSER_SDK/QChatServerServiceInterface";
import type {
  QChatMessage,
  QChatSystemNotification,
} from "nim-web-sdk-ng/dist/QCHAT_BROWSER_SDK/QChatMsgServiceInterface";
import type { SystemNotificationEvent } from "nim-web-sdk-ng/dist/QCHAT_BROWSER_SDK/QChatInterface";

const appKey = "NjMyZmVmZjFmNGM4Mzg1NDFhYjc1MTk1ZDFjZWIzZmE=";

interface Queue {
  id: string;
  onmsgs: Function;
  onsystemmsgs: Function;
}

interface QChatSocketArgs {
  pocket48Account: string;
  pocket48Token: string;
  pocket48ServerId: string;
}

/* 创建网易云信sdk的socket连接 */
class QChatSocket {
  public pocket48Account: string;
  public pocket48Token: string;
  public pocket48ServerId: string;
  public nim?: NIMSDK;
  public qChat?: QChatSDK;
  public queues: Queue[] = [];
  public serverInfo?: ServerInfo;

  constructor(options: QChatSocketArgs) {
    this.pocket48Account = options.pocket48Account;
    this.pocket48Token = options.pocket48Token;
    this.pocket48ServerId = options.pocket48ServerId;
  }

  // 初始化
  async init(): Promise<void> {
    // 获取地址
    this.nim = NIMSDK.getInstance({
      appkey: atob(appKey),
      account: this.pocket48Account,
      token: this.pocket48Token,
      // debugLevel: "debug",
    });

    await this.nim.connect();

    this.qChat = new QChatSDK({
      appkey: atob(appKey),
      account: this.pocket48Account,
      token: this.pocket48Token,
      linkAddresses: await this.nim.plugin.getQChatAddress({ ipType: 2 }),
    });

    this.qChat.on("logined", this.handleLogined);
    this.qChat.on("message", this.handleMessage);
    this.qChat.on("disconnect", this.handleRoomSocketDisconnect);
    this.qChat.on("systemNotification", this.handleSystemNotification);

    await this.qChat.login();
  }

  // 登录成功
  handleLogined: (loginResult: LoginResult) => Promise<void> = async (
    loginResult: LoginResult,
  ): Promise<void> => {
    const result: SubscribeAllChannelResult =
      await this.qChat!.qchatServer.subscribeAllChannel({
        type: 1,
        serverIds: [this.pocket48ServerId],
      });

    if (result.failServerIds.length > 0) {
      console.log("订阅服务器失败", `ServerId: ${result.failServerIds[0]}`);
    }

    const serverInfo: ServerInfo[] = await this.qChat!.qchatServer.getServers({
      serverIds: [this.pocket48ServerId],
    });

    this.serverInfo = serverInfo[0];
    // console.log("serverInfo", this.serverInfo, "订阅servers", result);

    await this.qChat!.qchatServer.subscribeServer({
      type: 4,
      opeType: 1,
      servers: [{ serverId: this.pocket48ServerId }],
    });
  };

  // message
  handleMessage: (event: QChatMessage) => void = (
    event: QChatMessage,
  ): void => {
    for (const item of this.queues) {
      item.onmsgs(event);
    }
  };

  // 系统消息
  handleSystemNotification: (event: SystemNotificationEvent) => void = (
    event: SystemNotificationEvent,
  ): void => {
    const systemNotifications: QChatSystemNotification[] =
      event.systemNotifications;

    for (const systemNotification of systemNotifications) {
      if (
        systemNotification.attach.serverInfo?.serverId === this.pocket48ServerId
      ) {
        for (const item of this.queues) {
          item.onsystemmsgs(systemNotification);
        }
      }
    }
  };

  // 断开连接
  handleRoomSocketDisconnect: () => void = (...args: any[]): void => {
    console.log("连接断开", args);
  };

  // 添加队列
  addQueue(queue: Queue): void {
    this.queues.push(queue);
  }

  // 移除队列
  removeQueue(id: string): void {
    const index: number = this.queues.findIndex(
      (o: Queue): boolean => o.id === id,
    );

    if (index >= 0) {
      this.queues.splice(index, 1);
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    if (this.queues.length === 0) {
      await this.qChat?.logout?.();
      await this.qChat?.destroy?.();
      await this.nim?.destroy?.();
      this.qChat = undefined;
      this.nim = undefined;
    }
  }
}

export default QChatSocket;
