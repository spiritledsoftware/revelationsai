import { chatService } from '$lib/server/services';
import { chats as chatsTable } from '@revelationsai/core/database/schema';
import { desc, eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const chats = await chatService.getChats({
		limit: 7,
		orderBy: desc(chatsTable.updatedAt),
		where: eq(chatsTable.userId, locals.user.id)
	});

	return {
		chats
	};
};
