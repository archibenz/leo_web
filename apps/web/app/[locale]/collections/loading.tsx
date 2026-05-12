import BrandLoader from '../../../components/BrandLoader';

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center pt-28">
      <BrandLoader size={96} speed="slow" />
    </div>
  );
}
