// Route-level loading UI for the White storefront: a plain white screen so the
// streaming shell never flashes the gradient site's dark splash while a White
// page streams in.
export default function WhiteLoading() {
  return <div aria-hidden="true" className="min-h-screen bg-white" />;
}
