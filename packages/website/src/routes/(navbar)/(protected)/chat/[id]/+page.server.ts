import { chatMessageService, chatService } from '$lib/server/services';
import { chats as chatsTable } from '@revelationsai/core/database/schema';
import { redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (params.id === 'new') {
		const chats = await chatService.getChats({
			limit: 1,
			orderBy: desc(chatsTable.updatedAt),
			where: eq(chatsTable.userId, locals.user.id)
		});
		redirect(307, `/chat/${chats[0].id}`);
	}

	const [chat, messages] = await Promise.all([
		chatService.getChat(params.id),
		chatMessageService.getChatMessages(params.id).then((response) => response.reverse())
	]);

	if (!chat) {
		throw redirect(302, '/chat');
	}

	return {
		chat,
		messages
	};
};
