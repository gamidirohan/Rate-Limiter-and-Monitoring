import { NextResponse } from "next/server"

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    init
  )
}

export function error(message: string, status = 500, init?: ResponseInit) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    {
      status,
      ...init,
    }
  )
}
