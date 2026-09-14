import type {ReactNode} from 'react';
import Providers from '../../../components/Providers';

export default function AdminRouteLayout({children}: {children: ReactNode}) {
  return (
    <Providers>
      {/* task-admin-white-brief.md: admin is a working tool, not a shop
          page — it needs none of the storefront chrome (Header/Footer are
          gone), it has its own shell (components/admin/AdminLayout.tsx). The
          class name stays "gradient-chrome" on purpose, unrenamed:
          app/globals.css still scopes the old gold focus-glow to it for the
          admin pages this branch does NOT touch yet (ProductForm/
          CollectionForm/CareGuideForm and the sections still on the old
          style) — dropping the class would silently de-style their inputs, a
          behaviour change this branch is not allowed to make. Remove it once
          every admin page has moved to the White language. */}
      <div className="gradient-chrome">{children}</div>
    </Providers>
  );
}
