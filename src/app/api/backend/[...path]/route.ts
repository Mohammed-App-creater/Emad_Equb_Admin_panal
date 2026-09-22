import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BACKEND_API_BASE_URL = "https://api.emadssl.com/api/v1";

const normalizeApiBaseUrl = (url?: string) => {
  if (!url) {
    return undefined;
  }

  return url
    .trim()
    .replace(/\/docs\/index\.html\/?$/i, "")
    .replace(/\/+$/, "");
};

const getBackendApiBaseUrl = () =>
  normalizeApiBaseUrl(process.env.BACKEND_API_BASE_URL) ??
  normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL) ??
  DEFAULT_BACKEND_API_BASE_URL;

const getForwardHeaders = (request: NextRequest) => {
  const headers = new Headers(request.headers);

  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("accept-encoding");

  return headers;
};

const getResponseHeaders = (response: Response) => {
  const headers = new Headers(response.headers);

  headers.delete("connection");
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");

  return headers;
};

const proxyRequest = async (
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) => {
  const { path } = await params;
  const backendUrl = new URL(`${getBackendApiBaseUrl()}/${path.join("/")}`);
  backendUrl.search = request.nextUrl.search;

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const response = await fetch(backendUrl, {
    method: request.method,
    headers: getForwardHeaders(request),
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: getResponseHeaders(response),
  });
};

export {
  proxyRequest as DELETE,
  proxyRequest as GET,
  proxyRequest as PATCH,
  proxyRequest as POST,
  proxyRequest as PUT,
};
