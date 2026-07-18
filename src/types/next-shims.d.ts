declare module "next" {
  export interface Metadata {
    title?: string;
    description?: string;
  }
}

declare module "next/server" {
  export class NextRequest extends Request {
    cookies: {
      get(name: string): { value: string } | undefined;
    };
    nextUrl: URL;
  }

  export class NextResponse extends Response {
    static json(body: unknown, init?: ResponseInit): NextResponse;
    cookies: {
      set(
        name: string,
        value: string,
        options?: {
          httpOnly?: boolean;
          sameSite?: "lax" | "strict" | "none";
          secure?: boolean;
          path?: string;
          expires?: Date;
        },
      ): void;
    };
  }
}

declare module "next/navigation" {
  export function redirect(path: string): never;
  export function notFound(): never;
  export function useRouter(): {
    replace(path: string): void;
    refresh(): void;
  };
}

declare module "next/headers" {
  export function cookies(): Promise<{
    get(name: string): { value: string } | undefined;
  }>;
}

declare module "next/link" {
  import type { AnchorHTMLAttributes, PropsWithChildren } from "react";

  export default function Link(
    props: PropsWithChildren<AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>,
  ): JSX.Element;
}

declare module "next/font/google" {
  export function Fraunces(options: {
    subsets: string[];
    variable: string;
  }): {
    variable: string;
  };

  export function Manrope(options: {
    subsets: string[];
    variable: string;
  }): {
    variable: string;
  };
}
