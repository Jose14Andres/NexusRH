// Access token en memoria (no en localStorage) para evitar XSS
let _token: string | null = null;

export const getAccessToken = () => _token;
export const setAccessToken = (t: string | null) => { _token = t; };
