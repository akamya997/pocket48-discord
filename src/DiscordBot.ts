import { Client, GatewayIntentBits, REST, Routes, TextChannel, AttachmentBuilder } from 'discord.js';

export interface PocketMessage {
  text: string,
  file: string,
  fileName: string,
}

export default class DiscordBot {
  token: string
  client_id: string
  client: Client
  channels: Array<string>

  constructor(token: string, client_id: string) {
    this.token = token;
    this.client_id = client_id;
    this.channels = [];
    this.register();

    this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
    
    this.client.on('ready', () => {
      console.log(`Logged in as ${this.client.user.tag}!`);
    });
    
    this.resolve_command();
    
    this.client.login(token);
  }

  async register() {
    const commands = [
      {
        name: 'ping',
        description: 'Replies with Pong!',
      },
      {
        name: 'register',
        description: 'Register current channel',
      }
    ];
    
    const rest = new REST({ version: '10' }).setToken(this.token);
    
    try {
      console.log('Started refreshing application (/) commands.');
    
      await rest.put(Routes.applicationCommands(this.client_id), { body: commands });
    
      console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
      console.error(error);
    }
  }

  async resolve_command() {
    this.client.on('interactionCreate', async interaction => {
      if (!interaction.isChatInputCommand()) return;
    
      if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
      }

      else if (interaction.commandName === 'register') {
        console.log(interaction.channelId, 'is added to channel list');
        this.channels.push(interaction.channelId);
        await interaction.reply('成功添加此频道');
      }
    });
  }

  async announce(msg: PocketMessage) {
    for(var channel_id of this.channels) {
      const channel = await this.client.channels.fetch(channel_id);
      if (msg.file !== '') {
        (channel as TextChannel).send({content: msg.text, files: [{attachment: msg.file, name: msg.fileName}]});
      }
      else (channel as TextChannel).send(msg.text);
    }
  }
}


