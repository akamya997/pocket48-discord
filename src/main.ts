import NimChatroomSocket from "./NimChatroomSocket";
import QChatSocket from "./QChatSocket";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import DiscordBot from "./DiscordBot";
import * as dotenv from "dotenv";
import { UserV2, CustomMessageAllV2 } from "./message";
import type { QChatSystemNotification } from "nim-web-sdk-ng/dist/QCHAT_BROWSER_SDK/QChatMsgServiceInterface";

function mp4Source(pathname: string): string {
  if (!pathname || pathname === "") return "";

  const url: URL = new URL(pathname, "https://mp4.48.cn/");

  return url.href;
}

function getRoomMessage(user: UserV2, data: CustomMessageAllV2) {
  let msg: string = "";
  let file: string = "";
  let fileName: string = "";
  const nickName: string = user?.nickName ?? "";
  const msgTime: string = dayjs(data.time).format("YYYY-MM-DD HH:mm:ss");
  if (data.type === "text") {
    msg = `${nickName}：${data.body}`;
  } else if (
    data.type === "custom" &&
    (data.attach.messageType === "REPLY" ||
      data.attach.messageType === "GIFTREPLY")
  ) {
    const replyInfo = data.attach.replyInfo ?? data.attach.giftReplyInfo;
    msg = `${replyInfo.replyName}：${replyInfo.replyText}
${nickName}：${replyInfo.text}`;
  } else if (data.type === "image") {
    msg = `${nickName} 发送了一张图片：
时间：${msgTime}`;
    file = data.attach.url;
    fileName = "photo.jpg";
  } else if (data.type === "audio") {
    msg = `${nickName} 发送了一条语音：${data.attach.url}
时间：${msgTime}`;
    file = data.attach.url;
    fileName = "audio.mp3";
  } else if (data.type === "video") {
    msg = `${nickName} 发送了一个视频：${data.attach.url}
时间：${msgTime}`;
    file = data.attach.url;
    fileName = "video.mp4";
  } else if (data.type === "custom" && data.attach.messageType === "AUDIO") {
    msg = `${nickName} 发送了一条语音：${data.attach.url}
时间：${msgTime}`;
    file = data.attach.url;
    fileName = "audio.mp3";
  } else if (data.type === "custom" && data.attach.messageType === "VIDEO") {
    msg = `${nickName} 发送了一个视频：${data.attach.url}
时间：${msgTime}`;
    file = data.attach.url;
    fileName = "video.mp4";
  } else if (data.type === "custom" && data.attach.messageType === "LIVEPUSH") {
    msg = `${nickName} 正在直播
直播标题：${data.attach.livePushInfo.liveTitle}
时间：${msgTime}`;
  } else if (
    data.type === "custom" &&
    data.attach.messageType === "TEAM_VOICE"
  ) {
    msg = `${data.attach.voiceInfo.voiceStarInfoList?.[0]?.nickname ?? ""}开启了房间电台
地址：${data.attach.voiceInfo.streamUrl}
时间：${msgTime}`;
  } else if (data.type === "custom" && data.attach.messageType === "FLIPCARD") {
    const info = data.attach.filpCardInfo ?? data.attach.flipCardInfo;
    msg = `${nickName} 翻牌了问题：
${info.question}
回答：${info.answer}
时间：${msgTime}`;
  } else if (
    data.type === "custom" &&
    (data.attach.messageType === "FLIPCARD_AUDIO" ||
      data.attach.messageType === "FLIPCARD_VIDEO")
  ) {
    const info =
      data.attach.filpCardInfo ??
      data.attach.flipCardInfo ??
      (data.attach.messageType === "FLIPCARD_AUDIO"
        ? data.attach.filpCardAudioInfo ?? data.attach.flipCardAudioInfo
        : data.attach.filpCardVideoInfo ?? data.attach.flipCardVideoInfo);
    const answer: { url: string } = JSON.parse(info.answer);
    msg = `${nickName} 翻牌了问题：
    ${info.question}
    回答：${mp4Source(answer.url)}
    时间：${msgTime}`;
    file = mp4Source(answer.url);
    fileName = answer.url;
  } else {
    // unimplemented info type
    console.log(
      "Unimplemented Info",
      `${nickName}：未知信息类型，请联系开发者。
数据：${JSON.stringify(data)}
时间：${msgTime}`,
    );
  }
  return {
    text: msg,
    file,
    fileName,
  };
}

// a magic to let the program run
// eslint-disable-next-line no-unused-vars
function magic() {
  const _socket = new NimChatroomSocket({
    pocket48IsAnonymous: true,
    pocket48Account: "",
    pocket48Token: "",
    pocket48RoomId: "1",
    messageIgnore: true,
  });
  return _socket;
}

async function main() {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  dayjs.tz.setDefault("Asia/Shanghai");
  dotenv.config();
  const bot = new DiscordBot(
    process.env.DISCORD_TOKEN!,
    process.env.CLIENT_ID!,
  );

  const roomSocket = new QChatSocket({
    pocket48Account: process.env.P48_ACCOUNT!,
    pocket48Token: process.env.P48_PWD!,
    pocket48ServerId: process.env.SERVER_ID!,
  });
  await roomSocket.init();
  roomSocket.addQueue({
    id: "Forward idol msg",
    onmsgs: (event: CustomMessageAllV2) => {
      let type: string = event.type;

      if (
        type === "custom" &&
        "attach" in event &&
        "messageType" in event.attach
      ) {
        type = event.attach.messageType;
      } else {
        type = type.toUpperCase();
      }

      const user = event.ext ? JSON.parse(event.ext).user : undefined;
      const isIdolUser: boolean = !!(user && user.roleId === 3 && !user.vip);
      const isPresentText: boolean = type === "PRESENT_TEXT"; // 投票信息
      const isGiftText: boolean = type === "GIFT_TEXT"; // 礼物信息
      const isTeamVoice: boolean = type === "TEAM_VOICE"; // 房间电台

      if (isIdolUser || isPresentText || isGiftText || isTeamVoice) {
        const msg2send = getRoomMessage(user, event);
        if (msg2send.text !== "") {
          bot.announce(msg2send);
          console.log("Bot announcing", msg2send);
        }
      }
    },
    onsystemmsgs: (event: QChatSystemNotification) => {},
  });
}

main();
