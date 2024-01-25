import { PUBLIC_API_URL } from '$env/static/public';
import apiConfig from '@revelationsai/client/configs/api';
import { commonCookies } from '@revelationsai/client/utils/cookies';
import type { UserInfo } from '@revelationsai/core/model/user';
import type { Handle, HandleServerError } from '@sveltejs/kit';
import { sessionService } from './lib/server/services';

apiConfig.url = PUBLIC_API_URL;

export const handle: Handle = async ({ resolve, event }) => {
	try {
		const session = event.cookies.get(commonCookies.session);
		if (!session) {
			console.debug('No session found');
			event.locals.user = undefined;
			event.locals.session = undefined;
			return resolve(event);
		}

		const validationInfo = await sessionService.validNonApiHandlerSession(session);
		if (!validationInfo.isValid) {
			console.debug('Invalid session token: ', session);
			event.locals.user = undefined;
			event.locals.session = undefined;
			return resolve(event);
		}
		event.locals.user = {
			...validationInfo.userWithRoles,
			maxQueries: validationInfo.maxQueries,
			remainingQueries: validationInfo.remainingQueries,
			maxGeneratedImages: validationInfo.maxGeneratedImages,
			remainingGeneratedImages: validationInfo.remainingGeneratedImages
		} satisfies UserInfo;
		event.locals.session = session;
	} catch (error) {
		console.debug('Error authorizing user:', error);
		// Unauthorized
		event.locals.user = undefined;
		event.locals.session = undefined;
	}

	return resolve(event);
};

export const handleError: HandleServerError = async ({ error, message }) => {
	if (error) {
		console.error(message, error);
	}

	return {
		message: 'Oops! Something went wrong.'
	};
};
