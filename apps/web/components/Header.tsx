import HeaderNavbar from './HeaderNavbar';
import type {Locale} from '../i18n';

type HeaderProps = {
  locale: Locale;
};

export default function Header({locale}: HeaderProps) {
  return <HeaderNavbar locale={locale} />;
}
