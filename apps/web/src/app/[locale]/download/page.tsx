import { DownloadView } from '../../../components/download/download-view';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ilovani yuklab olish',
  description:
    "Sellobay ilovasini iPhone, Android yoki kompyuteringizga yuklab oling. PWA — alohida o'rnatish kerak emas, brauzer orqali.",
};

export default function DownloadPage() {
  return <DownloadView />;
}
