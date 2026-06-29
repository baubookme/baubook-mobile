export const isGoogleSignInAvailable = false;

export async function getGoogleIdToken(): Promise<string | null> {
  throw new Error('Login Google disponibile solo nella build Android nativa.');
}
