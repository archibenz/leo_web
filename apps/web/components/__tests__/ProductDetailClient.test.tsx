import {render, act} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import ProductDetailClient from '../ProductDetailClient';

// galleryImages / sizeOptions are derived from the `product` prop only (JSON.parse
// + .map()). They must be memoized so the frequent, product-unrelated re-renders
// driven by `showSticky` (IntersectionObserver on the inline add-to-bag button,
// firing on every mobile scroll tick) don't re-parse JSON / rebuild these arrays.
// These tests assert reference stability across such a re-render, and that a real
// product change still produces a new reference.

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const pushMock = vi.fn();
const backMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({push: pushMock, back: backMock}),
  usePathname: () => '/en/product/a',
}));

vi.mock('../../contexts/CartContext', () => ({
  useCart: () => ({addItem: vi.fn()}),
}));

vi.mock('../../contexts/FavoritesContext', () => ({
  useFavorites: () => ({toggleItem: vi.fn(), isFavorite: () => false}),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({isAuthenticated: false}),
}));

vi.mock('../../lib/analytics', () => ({
  track: vi.fn(),
}));

const capturedGalleryImages: unknown[][] = [];
vi.mock('../ProductGallery', () => ({
  __esModule: true,
  default: ({images}: {images: unknown[]}) => {
    capturedGalleryImages.push(images);
    return <div data-testid="gallery" />;
  },
}));

const capturedSizeOptions: unknown[][] = [];
vi.mock('../SizeSelector', () => ({
  __esModule: true,
  default: ({sizes}: {sizes: unknown[]}) => {
    capturedSizeOptions.push(sizes);
    return <div data-testid="sizes" />;
  },
}));

vi.mock('../SizeChart', () => ({
  __esModule: true,
  default: () => null,
}));

type IntersectionCallback = (entries: Array<{isIntersecting: boolean}>) => void;

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];
  callback: IntersectionCallback;
  constructor(callback: IntersectionCallback) {
    this.callback = callback;
    IntersectionObserverMock.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

const baseProduct = {
  id: 'a',
  title: 'Dress A',
  subtitle: null,
  description: null,
  price: 1000,
  image: '/a.jpg',
  category: null,
  sizes: ['S', 'M'],
  isTest: false,
  occasion: null,
  color: null,
  material: null,
  sku: null,
  images: JSON.stringify([{src: '/a-1.jpg', alt: 'A 1'}]),
  collectionId: null,
  collectionName: null,
  inStock: true,
  careInstructions: null,
};

const otherProduct = {
  ...baseProduct,
  id: 'b',
  title: 'Dress B',
  sizes: ['L', 'XL'],
  images: JSON.stringify([{src: '/b-1.jpg', alt: 'B 1'}]),
};

beforeEach(() => {
  capturedGalleryImages.length = 0;
  capturedSizeOptions.length = 0;
  IntersectionObserverMock.instances = [];
  // @ts-expect-error -- jsdom has no IntersectionObserver; stub it for the test
  global.IntersectionObserver = IntersectionObserverMock;
  global.fetch = vi.fn().mockResolvedValue({ok: false, json: async () => []}) as unknown as typeof fetch;
});

describe('ProductDetailClient memoized derived state', () => {
  it('keeps the same galleryImages/sizeOptions reference across a showSticky-only re-render', async () => {
    const {rerender} = render(
      <ProductDetailClient productId="a" initialProduct={baseProduct} />,
    );

    expect(capturedGalleryImages).toHaveLength(1);
    expect(capturedSizeOptions).toHaveLength(1);
    const firstGallery = capturedGalleryImages[0];
    const firstSizes = capturedSizeOptions[0];

    // Simulate the inline add-to-bag button crossing the viewport edge, which
    // flips `showSticky` and forces a re-render unrelated to `product`.
    const observer = IntersectionObserverMock.instances[0];
    expect(observer).toBeDefined();
    act(() => {
      observer.callback([{isIntersecting: false}]);
    });

    // Re-render with the identical product prop reference (as React would on
    // an unrelated parent re-render) to force the component to run again.
    rerender(<ProductDetailClient productId="a" initialProduct={baseProduct} />);

    const lastGallery = capturedGalleryImages[capturedGalleryImages.length - 1];
    const lastSizes = capturedSizeOptions[capturedSizeOptions.length - 1];
    expect(lastGallery).toBe(firstGallery);
    expect(lastSizes).toBe(firstSizes);
  });

  it('recomputes galleryImages/sizeOptions when the product prop changes', () => {
    const {rerender} = render(
      <ProductDetailClient productId="a" initialProduct={baseProduct} />,
    );
    const firstGallery = capturedGalleryImages[capturedGalleryImages.length - 1];
    const firstSizes = capturedSizeOptions[capturedSizeOptions.length - 1];

    rerender(<ProductDetailClient productId="b" initialProduct={otherProduct} />);

    const lastGallery = capturedGalleryImages[capturedGalleryImages.length - 1];
    const lastSizes = capturedSizeOptions[capturedSizeOptions.length - 1];
    expect(lastGallery).not.toBe(firstGallery);
    expect(lastSizes).not.toBe(firstSizes);
    expect((lastSizes as Array<{label: string}>).map(s => s.label)).toEqual(['L', 'XL']);
  });
});
