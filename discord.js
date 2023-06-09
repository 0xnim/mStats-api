require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const token = process.env.DISCORD_TOKEN;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand() || interaction.commandName !== 'top-mods') {
    return;
  }

  const response = await axios.get('https://mstats.astromods.xyz/top-mods');
  const data = response.data;

  const sortedByTotal = data.mods.sort((a, b) => b.totalCount - a.totalCount);
  const sortedByEnabled = data.mods.sort((a, b) => b.enabledCount - a.enabledCount);

  const embed = new Discord.MessageEmbed()
    .setColor('#0099ff')
    .setTitle('Top Mods')
    .addFields(
      { name: 'Sorted by Total', value: sortedByTotal.map((mod) => `${mod.mod}: ${mod.totalCount}`).join('\n') },
      { name: 'Sorted by Enabled', value: sortedByEnabled.map((mod) => `${mod.mod}: ${mod.enabledCount}`).join('\n') },
    );

  const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
  const message = await reply.fetch();

  const interval = setInterval(async () => {
    const response = await axios.get('https://mstats.astromods.xyz/top-mods');
    const data = response.data;

    const sortedByTotal = data.mods.sort((a, b) => b.totalCount - a.totalCount);
    const sortedByEnabled = data.mods.sort((a, b) => b.enabledCount - a.enabledCount);

    const updatedEmbed = new Discord.MessageEmbed()
      .setColor('#0099ff')
      .setTitle('Top Mods')
      .addFields(
        { name: 'Sorted by Total', value: sortedByTotal.map((mod) => `${mod.mod}: ${mod.totalCount}`).join('\n') },
        { name: 'Sorted by Enabled', value: sortedByEnabled.map((mod) => `${mod.mod}: ${mod.enabledCount}`).join('\n') },
      );

    await message.edit({ embeds: [updatedEmbed] });
  }, 60000);

  interaction.client.once('interactionCreate', (interaction) => {
    if (interaction.isCommand() && interaction.commandName === 'stop-top-mods') {
      clearInterval(interval);
      interaction.reply('Stopped updating top mods.');
    }
  });
});

client.login(token);