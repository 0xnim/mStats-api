require('dotenv').config();
const { Client, Intents, SlashCommandBuilder, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

const guildId = process.env.GUILD_ID;
const updateInterval = parseInt(process.env.UPDATE_INTERVAL) || 60000;
let messageToUpdate = null;
let updateChannelId = null;

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'setchannel') {
    await interaction.deferReply();

    if (!interaction.inGuild()) {
      return interaction.followUp('This command can only be used in a server.');
    }

    const channel = interaction.channel;
    updateChannelId = channel.id;
    return interaction.followUp(`Message update channel has been set to <#${updateChannelId}>.`);
  }
});

async function updateMessageContent() {
  try {
    const response = await axios.get(process.env.API_ENDPOINT);

    const mods = response.data.mods;
    mods.sort((mod1, mod2) => mod2.totalCount - mod1.totalCount); // Sort mods by total count in descending order

    const topModsByTotal = mods.map((mod) => `${mod.mod}: ${mod.totalCount}`).join('\n') || 'No mods found';
    const enabledMods = mods.filter((mod) => mod.enabledCount > 0);
    enabledMods.sort((mod1, mod2) => mod2.enabledCount - mod1.enabledCount); // Sort enabled mods by enabled count in descending order

    const topModsByEnabled = enabledMods.map((mod) => `${mod.mod}: ${mod.enabledCount}`).join('\n') || 'No mods found';

    console.log('Top mods by total:', topModsByTotal);
    console.log('Top mods by enabled:', topModsByEnabled);

    const embed = new EmbedBuilder()
      .setTitle('Top Mods')
      .addFields({ name: 'Top Mods by Total', value: topModsByTotal, inline: true})
      .addFields({ name: 'Top Mods by Enabled', value: topModsByEnabled, inline: true})
      .setColor(0x0099ff);

    const channel = client.channels.cache.get(updateChannelId);
    if (!channel) {
      console.error('Invalid channel');
      return;
    }

    if (messageToUpdate) {
      messageToUpdate.edit({ embeds: [embed] });
    } else {
      const sentMessage = await channel.send({ embeds: [embed] });
      messageToUpdate = sentMessage;

      // Update the channel topic with the message ID
      channel.setTopic(`Message ID: ${messageToUpdate.id}`)
        .then(() => console.log('Channel topic updated with message ID:', messageToUpdate.id))
        .catch((error) => console.error('Error updating channel topic:', error));
    }
  } catch (error) {
    console.error('Error retrieving top mods:', error);
  }
}

// Load the message ID from the channel topic
function loadMessageId() {
  const channel = client.channels.cache.get(updateChannelId);
  if (channel && channel.isText()) {
    const topic = channel.topic;
    if (topic && topic.startsWith('Message ID: ')) {
      const messageId = topic.substring('Message ID: '.length);
      channel.messages.fetch(messageId)
        .then((message) => {
          messageToUpdate = message;
          console.log('Loaded message ID:', messageId);
        })
        .catch((error) => {
          console.error('Error fetching message:', error);
        });
    }
  }
}

// Register the slash commands
client.once('ready', async () => {
  try {
    // Fetch all existing commands
    const existingCommands = await client.guilds.cache.get(guildId)?.commands.fetch();

    // Delete all existing commands except the ones registered by your bot
    existingCommands.forEach(async (command) => {
      if (command.applicationId === client.application.id) {
        return;
      }

      await command.delete();
    });

    // Register the setchannel command
    const setChannelCommand = new SlashCommandBuilder()
      .setName('setchannel')
      .setDescription('Set the current channel for message updates')
      .toJSON();

    await client.guilds.cache.get(guildId)?.commands.create(setChannelCommand);
    console.log('Registered slash commands:');
    console.log(client.guilds.cache.get(guildId)?.commands.cache);
  } catch (error) {
    console.error('Error registering slash commands:', error);
  }
});

// Periodically update the message content
setInterval(updateMessageContent, updateInterval);

// Load the message ID when the bot starts up
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  loadMessageId();
});

client.login(process.env.BOT_TOKEN);
