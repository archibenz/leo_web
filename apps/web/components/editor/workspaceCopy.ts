import en from '../../messages/en.json';
import ru from '../../messages/ru.json';

export function workspaceCopy(locale: string) {
  return (locale === 'en' ? en : ru).editor.workspace;
}
