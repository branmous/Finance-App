import type { ReactNode } from "react";

import { Providers } from "./providers";

export const metadata = {
  title: "Finance App",
  description: "Personal finance app",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
