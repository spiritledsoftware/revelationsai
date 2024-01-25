import { PUBLIC_API_URL } from '$env/static/public';
import apiConfig from '@revelationsai/client/configs/api';
import type { HandleClientError } from '@sveltejs/kit';

apiConfig.url = PUBLIC_API_URL;

export const handleError: HandleClientError = async ({ error, message }) => {
	if (error) {
		console.error(message, error);
	}

	return {
		message: 'Oops! Something went wrong.'
	};
};
