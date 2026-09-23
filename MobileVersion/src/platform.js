import { Capacitor } from '@capacitor/core';

export const onPhone = () => Capacitor.isNativePlatform();

export const onAndroidBrowser = () =>
  !onPhone() && typeof navigator !== 'undefined' && (/Android/i.test(navigator.userAgent) || navigator.userAgentData?.platform === 'Android');

export const APK_URL = import.meta.env?.VITE_APK_URL;

export const offerApp = () => Boolean(APK_URL) && onAndroidBrowser();

export async function shareSave(filename, text) {
  if (onPhone()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: filename, dialogTitle: filename, files: [uri] });
    } catch (error) {

      if (!/cancel/i.test(String(error?.message ?? error))) throw error;
    }
    return 'shared';
  }

  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
