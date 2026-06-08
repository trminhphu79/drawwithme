import { environment } from '../../environments/environment';

/** Base URL for REST calls (proxied to the API in dev). */
export const API_URL = environment.apiUrl;

/** Socket.IO endpoint for the real-time canvas gateway. */
export const SOCKET_URL = environment.socketUrl;
