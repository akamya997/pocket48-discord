import { randomUUID } from "node:crypto";
import NIM_SDK from "@yxim/nim-web-sdk/dist/SDK/NIM_Web_SDK_nodejs.js";
import type NIM_Web_Chatroom from "@yxim/nim-web-sdk/dist/SDK/NIM_Web_Chatroom_nodejs"; // eslint-disable-line camelcase
import type { NIMChatroomMessage } from "@yxim/nim-web-sdk/dist/SDK/NIM_Web_Chatroom/NIMChatroomMessageInterface";

const appKey = "NjMyZmVmZjFmNGM4Mzg1NDFhYjc1MTk1ZDFjZWIzZmE=";

interface NIMError {
  code: number | string;
  message: string;
}

export interface Queue {
  id: string;
  onmsgs: Function;
}

interface NimChatroomSocketArgs {
  pocket48IsAnonymous?: boolean;
  pocket48Account?: string;
  pocket48Token?: string;
  pocket48RoomId?: string;
  messageIgnore?: boolean;
}

export interface ChatroomMember {
  type: string;
  account: string;
  online: boolean;
}

/**
 * 创建网易云信sdk的socket连接
 * 同一个房间只能连接一次，所以需要复用
 */
class NimChatroomSocket {
  public pocket48IsAnonymous?: boolean;
  public pocket48Account?: string;
  public pocket48Token?: string;
  public pocket48RoomId?: string;
  public queues: Array<Queue>;
  public nimChatroomSocket: NIM_Web_Chatroom | undefined; // eslint-disable-line camelcase

  constructor(arg: NimChatroomSocketArgs) {
    this.pocket48IsAnonymous = arg.pocket48IsAnonymous; // 是否为游客模式
    this.pocket48Account = arg.pocket48Account; // 账号
    this.pocket48Token = arg.pocket48Token; // token
    this.pocket48RoomId = arg.pocket48RoomId; // 房间id
    this.queues = [];
  }

  // 初始化
  init(): Promise<void> {
    const self: this = this;

    return new Promise((resolve: Function, reject: Function): void => {
      const options: any = self.pocket48IsAnonymous
        ? {
            isAnonymous: true,
            chatroomNick: randomUUID(),
            chatroomAvatar: "",
          }
        : {
            account: this.pocket48Account,
            token: this.pocket48Token,
          };

      this.nimChatroomSocket = NIM_SDK.Chatroom.getInstance({
        appKey: atob(appKey),
        debugLevel: "debug",
        chatroomId: this.pocket48RoomId,
        chatroomAddresses: ["chatweblink01.netease.im:443"],
        onconnect(event: any): void {
          resolve();
          console.log("进入聊天室", event);
        },
        onmsgs: this.handleRoomSocketMessage,
        onerror: this.handleRoomSocketError,
        ondisconnect: this.handleRoomSocketDisconnect,
        db: false,
        dbLog: false,
        ...options,
      });
    });
  }

  // 事件监听
  handleRoomSocketMessage: Function = (
    event: Array<NIMChatroomMessage>,
  ): void => {
    for (const item of this.queues) {
      item.onmsgs(event);
    }
  };

  // 进入房间失败
  handleRoomSocketError: Function = (err: NIMError, event: any): void => {
    console.log("发生错误", err, event);
  };

  // 断开连接
  handleRoomSocketDisconnect: Function = (err: NIMError): void => {
    console.log("连接断开", err);
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
  disconnect(): void {
    if (this.queues.length === 0) {
      this.nimChatroomSocket?.disconnect?.({
        done(): void {
          /* noop */
        },
      });
      this.nimChatroomSocket = undefined;
    }
  }

  /**
   * 获取当前房间内的参观者
   * @param { boolean } [guest = true] - 是否为游客（其他小偶像也为游客）
   */
  getChatroomMembers(guest: boolean = true): Promise<Array<ChatroomMember>> {
    return new Promise((resolve: Function, reject: Function): void => {
      this.nimChatroomSocket!.getChatroomMembers({
        // @ts-ignore
        guest,
        done(err: Error, arg1: { members: Array<ChatroomMember> }): void {
          console.log(err);
          resolve(arg1?.members ?? []);
        },
      });
    });
  }
}

export default NimChatroomSocket;
