import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  TextChannel,
} from "discord.js";
import channelDb from "./db";

export interface PocketMessage {
  text: string;
  file: string;
  fileName: string;
}

export default class DiscordBot {
  token: string;
  client_id: string;
  client: Client;
  channelDb: channelDb;

  constructor(token: string, clientId: string) {
    this.token = token;
    this.client_id = clientId;
    this.channelDb = new channelDb();
    this.register();

    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });

    this.client.on("ready", () => {
      console.log(`Logged in as ${this.client.user.tag}!`);
    });

    this.resolve_command();

    this.client.login(token);
  }

  async register() {
    const commands = [
      {
        name: "ping",
        description: "Replies with Pong!",
      },
      {
        name: "register",
        description: "Register current channel",
      },
      {
        name: "unregister",
        description: "Remove this channel from announcement group",
      },
    ];

    const rest = new REST({ version: "10" }).setToken(this.token);

    try {
      console.log("Started refreshing application (/) commands.");

      await rest.put(Routes.applicationCommands(this.client_id), {
        body: commands,
      });

      console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
      console.error(error);
    }
  }

  async resolve_command() {
    this.client.on("interactionCreate", async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === "ping") {
        await interaction.reply("Pong!");
      } else if (interaction.commandName === "register") {
        console.log("try adding", interaction.channelId);
        if (await this.channelDb.exist(interaction.channelId))
          await interaction.reply("频道已存在");
        else {
          await interaction.reply("成功添加此频道");
          await this.channelDb.insert(interaction.channelId);
        }
      } else if (interaction.commandName === "unregister") {
        console.log("try removing", interaction.channelId);
        if (await this.channelDb.exist(interaction.channelId)) {
          await this.channelDb.delete(interaction.channelId);
          await interaction.reply("成功移除此频道");
        } else await interaction.reply("频道不在通知列表中");
      }
    });
  }

  async announce(msg: PocketMessage) {
    const channels = await this.channelDb.getAllId();
    for (const channelRow of channels) {
      const channel = await this.client.channels.fetch(channelRow.channelId);
      if (msg.file !== "") {
        (channel as TextChannel).send({
          content: msg.text,
          files: [{ attachment: msg.file, name: msg.fileName }],
        });
      } else (channel as TextChannel).send(msg.text);
    }
  }
}
