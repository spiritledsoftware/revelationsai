import { PUBLIC_SENTRY_DSN } from '$env/static/public';
import { getUserInfo } from '$lib/services/user';
import { commonCookies } from '$lib/utils/cookies';
import * as Sentry from '@sentry/sveltekit';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

Sentry.init({
	dsn: PUBLIC_SENTRY_DSN,
	tracesSampleRate: 1
});

export const handle: Handle = sequence(Sentry.sentryHandle(), async ({ resolve, event }) => {
	try {
		const session = event.cookies.get(commonCookies.session);
		if (!session) {
			console.debug('No session found');
			event.locals.user = undefined;
			event.locals.session = undefined;
			return resolve(event);
		}

		event.locals.user = await getUserInfo(session);
		event.locals.session = session;
	} catch (error) {
		console.debug('Error authorizing user:', error);
		// Unauthorized
		event.locals.user = undefined;
		event.locals.session = undefined;
	}

	return resolve(event);
});

export const handleError = Sentry.handleErrorWithSentry();
