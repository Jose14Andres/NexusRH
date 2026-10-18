export function extractErrorMessage(err: unknown, defaultMessage = 'Ocurrió un error'): string {
  if (err instanceof Error) {
    // Si Axios envuelve la respuesta, el body de error suele estar en err.response?.data?.error
    const axiosError = err as { response?: { data?: { error?: string } } };
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    return err.message;
  }

  // Fallback si err no es Error pero tiene estructura Axios
  const unknownError = err as { response?: { data?: { error?: string } } };
  return unknownError?.response?.data?.error ?? defaultMessage;
}
