import {checkAnalyticsAccess} from '../../../../../lib/analyticsAccessServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return checkAnalyticsAccess(request);
}
