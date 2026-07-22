import type {Metadata} from 'next';
import WhiteAccountShowcase from './WhiteAccountShowcase';

// Account — sign in / sign up over the shared auth backend. Personal, so it
// stays out of the index.

type Props = {params: Promise<{locale: string}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const ru = locale === 'ru';
  return {
    title: ru ? 'Аккаунт' : 'Account',
    description: ru
      ? 'Вход и регистрация REINASLEO: избранное и заказы — в одном аккаунте.'
      : 'REINASLEO sign in and sign up: favourites and orders in one account.',
    robots: {index: false, follow: false},
  };
}

export default async function WhiteAccountPage({params}: Props) {
  const {locale} = await params;
  return <WhiteAccountShowcase locale={locale} />;
}
