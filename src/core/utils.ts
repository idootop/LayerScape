export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const kIsMac = navigator.userAgent.includes('Mac');
