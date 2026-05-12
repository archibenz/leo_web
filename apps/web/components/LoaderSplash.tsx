import BrandLoader from './BrandLoader';

type LoaderSplashProps = {
  size?: number;
};

export default function LoaderSplash({size = 128}: LoaderSplashProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-paper/85 backdrop-blur-md">
      <BrandLoader size={size} speed="slow" />
    </div>
  );
}
