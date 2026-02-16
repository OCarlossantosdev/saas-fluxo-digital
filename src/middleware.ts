import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // 1. Prepara a resposta base
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 2. Tenta criar o cliente do Supabase
  // Se der erro aqui, é porque as chaves .env não estão configuradas,
  // mas o try/catch evita que o site trave inteiro.
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // 3. Verifica o usuário
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 4. Regras de Segurança
    const isPublicRoute = 
      request.nextUrl.pathname.startsWith("/login") || 
      request.nextUrl.pathname.startsWith("/register");

    // Se NÃO tem usuário e NÃO está em uma rota pública -> Manda pro Login
    if (!user && !isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Se TEM usuário e tenta acessar Login ou Registro -> Manda pro Dashboard
    if (user && isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  } catch (e) {
    // Se o Supabase falhar (ex: sem chaves), permite o acesso para não travar o dev
    console.error("Erro no Middleware Supabase:", e);
    return response;
  }

  return response;
}

// Configuração das rotas que o middleware deve proteger
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};