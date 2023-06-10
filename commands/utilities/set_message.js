const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('sendmessage')
		.setDescription('Send a message to be used as the updatable message.'),
	async execute(interaction) {
		const channel = interaction.client.channels.cache.get('1116510354097315931');
		const exampleEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Top Mods')
			.setURL('https://astromods.xyz/')
			.addFields(
				{ name: 'Top Installed Mods', value: 'Loading...', inline: true },
				{ name: 'Top Used Mods', value: 'Loading...', inline: true },
			)
			.setTimestamp()

		channel.send({ embeds: [exampleEmbed] });
		await interaction.reply('Message Sent!');
	},
};