import type {Metadata} from 'next';
import {getTranslations} from 'next-intl/server';
import ContactForm from '../../../components/ContactForm';
import type {Locale} from '../../../i18n';

type Props = {params: Promise<{locale: Locale}>};

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {locale} = await params;
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'Контакты' : 'Contact',
    description: isRu
      ? 'Свяжитесь с REINASLEO: вопросы по заказам, сотрудничество, обратная связь.'
      : 'Get in touch with REINASLEO: order inquiries, collaboration, and feedback.',
    alternates: {
      canonical: `/${locale}/contact`,
      languages: {en: '/en/contact', ru: '/ru/contact'},
    },
  };
}

const MailIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const TelegramIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const VkIcon = (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.525-2.049-1.714-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.12-5.339-3.202-2.17-3.048-2.763-5.339-2.763-5.814 0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.864 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.814-.542 1.27-1.422 2.17-3.615 2.17-3.615.119-.254.322-.491.762-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.78 1.203 1.253.745.847 1.32 1.558 1.473 2.049.17.49-.085.744-.576.744z" />
  </svg>
);

const contactChannels = [
  {key: 'email', label: 'Email', value: 'reinasleo@gmail.com', href: 'mailto:reinasleo@gmail.com', icon: MailIcon},
  {key: 'telegram', label: 'Telegram', value: '@reinasleo', href: 'https://t.me/reinasleo', icon: TelegramIcon},
  {key: 'vk', label: 'VK', value: 'vk.com/reinasleo', href: 'https://vk.com/reinasleo', icon: VkIcon},
];

export default async function ContactPage({params}: Props) {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'contact'});

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-28">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[#D4A574]/15 bg-[#1c100b]/55 shadow-[0_40px_80px_rgba(0,0,0,0.45)] md:grid-cols-[1fr_0.70fr]">
        {/* Left — context + channels */}
        <div className="flex flex-col gap-4 p-8 lg:p-11">
          <h1 className="font-display text-3xl tracking-wide text-ink md:text-4xl">
            {t('title')}
          </h1>
          <p className="max-w-md text-[14px] leading-relaxed text-ink/55 md:text-[15px]">
            {t('subtitle')}
          </p>
          <p className="max-w-md text-[12px] leading-relaxed text-ink/65 md:text-[13px]">
            {t('responseTime')}
          </p>

          <div className="mt-3 grid gap-1">
            {contactChannels.map((channel) => {
              const external = channel.href.startsWith('http');
              return (
                <a
                  key={channel.key}
                  href={channel.href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  className="group flex items-center gap-3 py-2.5"
                >
                  <span className="flex items-center justify-center rounded-lg border border-[#D4A574]/15 bg-[#140c08]/50 p-3 text-[#D4A574]/80 transition-colors duration-300 group-hover:border-[#D4A574]/30 group-hover:text-[#D4A574]">
                    {channel.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-ink">{channel.label}</span>
                    <span className="block text-[12px] text-ink/55 transition-colors duration-300 group-hover:text-[#D4A574]/80">
                      {channel.value}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Right — form, vertically centred (efferd contact-4) */}
        <div className="flex items-center border-t border-[#D4A574]/[0.12] bg-[#140c08]/35 p-8 md:border-l md:border-t-0 lg:p-11">
          <div className="w-full">
            <ContactForm />
          </div>
        </div>
      </div>
    </main>
  );
}
