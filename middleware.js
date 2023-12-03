import { headers } from 'next/headers'
import { NextResponse, userAgent } from 'next/server'

export function middleware(req, ev) {
  if(req.method === "OPTIONS") {
    return res.status(200).send({ message: 'ok' });
  }
  const headersInstance = headers()
  const authorization = headersInstance.get('Authorization')
  if (!authorization || authorization !== process.env.DATA_API_KEY) {
    return NextResponse.json(
      {
        message: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  return NextResponse.next();
} 

