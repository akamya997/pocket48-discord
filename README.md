# Pocket48-Discord

一个简易的将口袋48房间xox发的消息利用Discord Bot进行转发的程序，目前只支持转发一个特定的房间。

相关API参考了 [qqtools](https://github.com/duan602728596/qqtools)

## Setup

在node20环境下测试可以正常运行。

参照 `.env.example` 进行配置，需要注意account和pwd不是用于登录口袋48的账号，需要通过API获取。

```bash
npm intall
npm run build
npm run start
```

## Discord Bot

需要注册一个Bot，邀请到频道后使用 `\register` 对频道进行注册。

## 调试

```bash
npm run test
```
