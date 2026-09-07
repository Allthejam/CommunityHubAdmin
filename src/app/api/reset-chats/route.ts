
import { resetChats } from '@/lib/actions/chatActions';
import { NextResponse } from 'next/server';

export async function POST() {
  const response = await resetChats();
  if (response.success) {
    return NextResponse.json({ message: response.message });
  } else {
    return NextResponse.json({ error: response.error }, { status: 500 });
  }
}
