import './polyfill.cjs';
import dayjs from 'dayjs';
import QChatSocket from "./QChatSocket";
import DiscordBot, { PocketMessage } from './DiscordBot';
import * as dotenv from 'dotenv';

function mp4Source(pathname: string): string {
  if (!pathname || pathname === '') return '';

  const url: URL = new URL(pathname, 'https://mp4.48.cn/');

  return url.href;
}

function getRoomMessage(user, data) {
  let msg: string = '';
  let file: string = '';
  const nickName: string = user?.nickName ?? '';
  const msgTime: string = dayjs(data.time).format('YYYY-MM-DD HH:mm:ss');
  if (data.type === 'text') {
    msg = `${ nickName }：${ data.body }
时间：${ msgTime }$`;
  }
  else if (data.type === 'custom' && (data.attach.messageType === 'REPLY' || data.attach.messageType === 'GIFTREPLY')) {
    const replyInfo = data.attach.replyInfo ?? data.attach.giftReplyInfo;
    msg = `${ replyInfo.replyName }：${ replyInfo.replyText }
${ nickName }：${ replyInfo.text }
时间：${ msgTime }`;
  }
  else if (data.type === 'image') {
    msg = `${ nickName } 发送了一张图片：
${ msgTime }`;
    file = data.attach.url;
  }
  else if (data.type === 'audio') {
    msg = `${ nickName } 发送了一条语音：${ data.attach.url }
时间：${ msgTime }`;
  }
  else if (data.type === 'video') {
    msg = `${ nickName } 发送了一个视频：${ data.attach.url }
时间：${ msgTime }`;
  }
  else if (data.type === 'custom' && data.attach.messageType === 'AUDIO') {
    msg = `${ nickName } 发送了一条语音：${ data.attach.url }
时间：${ msgTime }`;
  }
  else if (data.type === 'custom' && data.attach.messageType === 'VIDEO') {
    msg = `${ nickName } 发送了一个视频：${ data.attach.url }
时间：${ msgTime }`;
  }
  else if (data.type === 'custom' && data.attach.messageType === 'LIVEPUSH') {
    msg = `${ nickName } 正在直播
直播标题：${ data.attach.livePushInfo.liveTitle }
时间：${ msgTime }`;
  }
  else if (data.type === 'custom' && data.attach.messageType === 'TEAM_VOICE') {
    msg = `${ data.attach.voiceInfo.voiceStarInfoList?.[0]?.nickname ?? '' }开启了房间电台
地址：${ data.attach.voiceInfo.streamUrl }
时间：${ msgTime }`;
  }
  else if (data.type === 'custom' && data.attach.messageType === 'FLIPCARD') {
    const info = data.attach.filpCardInfo ?? data.attach.flipCardInfo;
    msg = `${ nickName } 翻牌了问题：
${ info.question }
回答：${ info.answer }
时间：${ msgTime }`;
  }
  else if (
    data.type === 'custom'
    && (data.attach.messageType === 'FLIPCARD_AUDIO'
    || data.attach.messageType === 'FLIPCARD_VIDEO')
  ) {
    const info = (data.attach.filpCardInfo ?? data.attach.flipCardInfo)
        ?? (data.attach.messageType === 'FLIPCARD_AUDIO'
          ? (data.attach.filpCardAudioInfo ?? data.attach.flipCardAudioInfo)
          : (data.attach.filpCardVideoInfo ?? data.attach.flipCardVideoInfo)
        );
    const answer: { url: string } = JSON.parse(info.answer);
    msg = `${ nickName } 翻牌了问题：
    ${ info.question }
    回答：${ mp4Source(answer.url) }
    时间：${ msgTime }`;
  }
  else {
    // unimplemented info type
    console.log('Unimplemented Info', `${ nickName }：未知信息类型，请联系开发者。
数据：${ JSON.stringify(data) }
时间：${ msgTime }`);
  }
  return {
    text: msg,
    file
  };
}

async function main() {
  dotenv.config();
  const bot = new DiscordBot(process.env.DISCORD_TOKEN, process.env.CLIENT_ID);
  const roomSocket = new QChatSocket({
    pocket48Account: process.env.P48_ACCOUNT,
    pocket48Token: process.env.P48_PWD,
    pocket48ServerId: process.env.SERVER_ID
  });
  roomSocket.addQueue({
    id: "Forward idol msg",
    onmsgs: (event)=>{
      let type: string = event.type;

      if (type === 'custom' && ('attach' in event) && ('messageType' in event.attach)) {
        type = event.attach.messageType;
      } else {
        type = type.toUpperCase();
      }


      const user = event.ext ? JSON.parse(event.ext).user : undefined;
      const isIdolUser: boolean = !!(user && user.roleId === 3 && !user.vip);
      const isPresentText: boolean = type === 'PRESENT_TEXT'; // 投票信息
      const isGiftText: boolean = type === 'GIFT_TEXT';       // 礼物信息
      const isTeamVoice: boolean = type === 'TEAM_VOICE';     // 房间电台

      if (isIdolUser || isPresentText || isGiftText || isTeamVoice) {
        const msg2send = getRoomMessage(user, event);
        if (msg2send) {
          bot.announce(msg2send);
          console.log('Bot announcing', msg2send);
        }
      }
    },
    onsystemmsgs: (event)=>{}
  });
}

main()
