// Route-level loading UI for the White storefront: a plain white screen so the
// streaming shell never flashes the gradient site's dark splash while a White
// page streams in.
//
// data-shop-loading прячет подвал, пока стоит эта заглушка (globals.css,
// .wv-root:has([data-shop-loading])). Прежде подвал стоял под заглушкой во весь
// экран и, когда страница приходила короче, прыгал вверх в видимую область:
// CLS 0,075–1,16 на сумке, аккаунте, info и 404 (вычистка 26.09).
export default function WhiteLoading() {
  return <div aria-hidden="true" data-shop-loading="" className="min-h-screen bg-white" />;
}
