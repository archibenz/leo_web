import {NextRequest} from 'next/server';
import {verifyJwt} from './auth';
import {prisma} from './prisma';

export async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const payload = verifyJwt(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({where: {id: payload.userId}});
  return user;
}
