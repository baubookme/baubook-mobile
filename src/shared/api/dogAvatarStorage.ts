import { hasSupabaseConfig } from '../lib/env';
import { getSupabaseClient } from '../lib/supabase';
import { normalizeError } from './authAccount';

const DOG_AVATARS_BUCKET = 'dog-avatars';

function extensionFromUri(uri: string): string {
  const cleanUri = uri.split('?')[0] ?? uri;
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
  const extension = match?.[1]?.toLowerCase();

  if (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'webp') {
    return extension === 'jpeg' ? 'jpg' : extension;
  }

  return 'jpg';
}

function contentTypeFromExtension(extension: string): string {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    default:
      return 'image/jpeg';
  }
}

export async function uploadDogAvatar(dogId: string, uri: string): Promise<string> {
  const client = getSupabaseClient();

  if (!hasSupabaseConfig || !client) {
    throw new Error('Supabase non configurato: impossibile caricare la foto del cane.');
  }

  const extension = extensionFromUri(uri);
  const contentType = contentTypeFromExtension(extension);
  const path = `${dogId}/avatar-${Date.now()}.${extension}`;
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error('Non riesco a leggere il file immagine selezionato.');
  }

  const fileBody = await response.arrayBuffer();
  const { error } = await client.storage.from(DOG_AVATARS_BUCKET).upload(path, fileBody, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(normalizeError(error));
  }

  const { data } = client.storage.from(DOG_AVATARS_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error('Foto caricata, ma URL pubblico non restituito.');
  }

  return data.publicUrl;
}
