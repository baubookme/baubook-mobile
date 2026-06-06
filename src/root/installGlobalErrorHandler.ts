declare global {
  // Piccolo buffer consultabile dal debugger/devtools.
  // eslint-disable-next-line no-var
  var __BAUBOOK_LAST_RUNTIME_ERROR__: string | undefined;
}

type ReactNativeErrorUtils = {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

type WebLikeGlobal = typeof globalThis & {
  ErrorUtils?: ReactNativeErrorUtils;
  addEventListener?: (
    type: 'error' | 'unhandledrejection',
    handler: (event: { error?: unknown; message?: string; reason?: unknown }) => void,
  ) => void;
};

let installed = false;

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack ?? ''}`;
  }
  return String(error);
}

export function installGlobalErrorHandler() {
  if (installed) {
    return;
  }
  installed = true;

  const runtimeGlobal = globalThis as WebLikeGlobal;
  const previousHandler = runtimeGlobal.ErrorUtils?.getGlobalHandler?.();

  runtimeGlobal.ErrorUtils?.setGlobalHandler?.((error: unknown, isFatal?: boolean) => {
    const message = stringifyError(error);
    globalThis.__BAUBOOK_LAST_RUNTIME_ERROR__ = message;
    console.error(`[BauBook runtime${isFatal ? ' fatal' : ''}]`, message);
    previousHandler?.(error, isFatal);
  });

  runtimeGlobal.addEventListener?.('error', (event) => {
    const error = event.error ?? event.message;
    const message = stringifyError(error);
    globalThis.__BAUBOOK_LAST_RUNTIME_ERROR__ = message;
    console.error('[BauBook web error]', message);
  });

  runtimeGlobal.addEventListener?.('unhandledrejection', (event) => {
    const message = stringifyError(event.reason);
    globalThis.__BAUBOOK_LAST_RUNTIME_ERROR__ = message;
    console.error('[BauBook unhandled promise]', message);
  });
}
