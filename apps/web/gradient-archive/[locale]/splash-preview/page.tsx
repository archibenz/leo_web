import type {Metadata} from 'next';
import LoaderSplash from '../../../components/LoaderSplash';

export const metadata: Metadata = {
  robots: {index: false, follow: false},
};

export default function SplashPreviewPage() {
  return <LoaderSplash />;
}
